# Real-Time SSE Stream Operations & API Guide

## 1. Stream Endpoint

```http
GET /api/realtime/security-stream
Authorization: Bearer <JWT_TOKEN>
Accept: text/event-stream
```

### Connection Characteristics
- **Transport**: Server-Sent Events (SSE) over persistent HTTP/1.1 or HTTP/2.
- **Heartbeat Ping**: Automatic comment ping (`: heartbeat`) dispatched every 15 seconds to prevent gateway/proxy timeouts.
- **Auto-Reconnect**: Client automatically attempts reconnection with exponential backoff on disconnect.

---

## 2. Multi-Tenant RBAC Filtering

The event stream enforces real-time RBAC scoping on every broadcast:
- **`ADMIN`**: Global stream of all security telemetry across all cinema venues and movies.
- **`PRODUCTION_COMPANY`**: Scoped strictly to events matching movies owned by the authenticated studio (`movieId == company.movies`).
- **`THEATRE_STAFF`**: Scoped strictly to events originating from their assigned theatre location (`theatreId == user.theatreId`).
