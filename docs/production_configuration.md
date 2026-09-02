# Production Deployment & Infrastructure Guide

This document outlines production infrastructure, HTTPS reverse proxy configuration, object storage integration, and network security for the Theatre Anti-Piracy Platform.

---

## 1. Architecture Overview

```text
               Internet Traffic (HTTPS :443)
                            │
                            ▼
              ┌───────────────────────────┐
              │  Nginx / Cloudflare / ALB │ (TLS Termination, HSTS, Rate Limiting)
              └─────────────┬─────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
            ▼                               ▼
  ┌───────────────────┐           ┌───────────────────┐
  │  Next.js Frontend │           │    Express API    │
  │    (Port 3000)    │           │    (Port 4000)    │
  └───────────────────┘           └─────────┬─────────┘
                                            │
                                            ▼
                                  ┌───────────────────┐
                                  │ PostgreSQL 16 DB  │
                                  │    (Port 5432)    │
                                  └───────────────────┘
```

---

## 2. Nginx Production Reverse Proxy Configuration

```nginx
# /etc/nginx/sites-available/theatre-antipiracy.conf

server {
    listen 80;
    server_name portal.theatre-guard.com api.theatre-guard.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name portal.theatre-guard.com;

    ssl_certificate /etc/letsencrypt/live/portal.theatre-guard.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/portal.theatre-guard.com/privkey.pem;

    # SSL Hardening
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name api.theatre-guard.com;

    ssl_certificate /etc/letsencrypt/live/api.theatre-guard.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.theatre-guard.com/privkey.pem;

    client_max_body_size 5000M; # Accommodate raw movie uploads

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 3. Environment Variables Separation

| Variable | Development Default | Production Requirement |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` | `production` |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/...` | Managed PostgreSQL with SSL (`?sslmode=require`) |
| `JWT_SECRET` | Development auto-fallback | **Mandatory** 256-bit cryptographically secure secret |
| `STORAGE_DRIVER` | `local` | `s3` (AWS S3 / Cloudflare R2 / MinIO) |
| `DRM_PROVIDER` | `mock` | `widevine` / `playready` / `fairplay` with KMS credentials |
| `CORS_ORIGIN` | `http://localhost:3000` | Strict production domain (e.g. `https://portal.theatre-guard.com`) |

---

## 4. Docker Production Quickstart

```bash
# 1. Clone repository & configure production environment
cp .env.example .env
nano .env

# 2. Build & launch isolated containers
docker-compose up -d --build

# 3. Check health status
curl http://localhost:4000/api/health/system
```
