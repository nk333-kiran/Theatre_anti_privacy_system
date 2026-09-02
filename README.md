# Theatre Anti-Piracy QR Activation & Verification System (Phase 1)

A modern, high-performance, modular system designed to protect theatre screenings and film rights through secure QR-based ticket verification and monitoring.

---

## 🚀 Phase 1 Features & Deliverables

1. **Monorepo Architecture**: Clean separation between `/web` (Frontend/Admin Dashboard), `/api` (Node.js REST API), and `/database` (Prisma ORM schema & Client).
2. **Next.js + TypeScript + Tailwind CSS**: Clean, responsive, dark-mode admin interface with sleek cards, live status badges, and data tables.
3. **Node.js Express API**: Centralized error handling, JWT authentication, and structured endpoints.
4. **PostgreSQL + Prisma ORM**: Complete database schema with 7 core models:
   - `User` (Admin & Staff management)
   - `Theatre` (Cinemas & Locations)
   - `Screen` (Auditoriums & Capacities)
   - `Movie` (Film library & Metadata)
   - `Show` (Schedules & Status)
   - `Ticket` (Seat assignments & Pricing)
   - `Activation` (Anti-piracy device fingerprints, timestamps & states)
5. **Admin Authentication & Dashboard**:
   - `/login` Admin login with form validation and feedback.
   - `/dashboard` KPI stat cards, shows monitor, theatre directory, and live status indicators.

---

## 📁 Directory Structure

```
├── /database
│   ├── prisma/
│   │   └── schema.prisma    # Prisma models & relationships
│   ├── src/
│   │   ├── client.ts        # PrismaClient singleton
│   │   └── index.ts         # Database package entrypoint
│   ├── package.json
│   └── tsconfig.json
├── /api
│   ├── src/
│   │   ├── controllers/     # Auth & Dashboard controllers
│   │   ├── middleware/      # Error handler & JWT auth middleware
│   │   ├── routes/          # API route definitions
│   │   ├── types/           # TypeScript interfaces & types
│   │   └── index.ts         # Server bootstrapper
│   ├── package.json
│   └── tsconfig.json
├── /web
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/       # Admin Login Page
│   │   │   ├── dashboard/   # Admin Dashboard Page
│   │   │   ├── globals.css  # Tailwind styling & animations
│   │   │   ├── layout.tsx   # Root layout
│   │   │   └── page.tsx     # Smart router redirect
│   │   ├── components/      # Sidebar, Header, StatCard, DataTable
│   │   └── lib/             # API client & helpers
│   ├── tailwind.config.ts
│   ├── postcss.config.mjs
│   ├── next.config.mjs
│   └── package.json
├── .env.example             # Environment variables template
├── package.json             # Root workspace scripts
└── README.md                # System documentation
```

---

## ⚙️ Prerequisites

- **Node.js**: v18.x or later (tested on v25.x)
- **npm**: v9.x or later
- **PostgreSQL**: Optional for local testing (mock fallbacks included for quick evaluation)

---

## 🛠️ Setup & Installation Instructions

### 1. Clone & Install Dependencies

From the repository root directory, run:

```bash
# Install all dependencies across all workspaces (database, api, web)
npm install
```

### 2. Configure Environment Variables

Copy the example environment configuration:

```bash
# On Linux / macOS
cp .env.example .env

# On Windows (PowerShell)
Copy-Item .env.example .env
```

Review `.env` and set your PostgreSQL connection string if running a local database:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/theatre_antipiracy_db?schema=public"
PORT=4000
JWT_SECRET="super-secret-theatre-anti-piracy-key-replace-in-production"
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
```

### 3. Generate Prisma Client & Run Migrations

```bash
# Generate the Prisma Client
npm run db:generate

# Push schema directly to your PostgreSQL database (if connected)
npm run db:push
```

---

## 🏃 Running the Application

### Option A: Run Full Stack Simultaneously

```bash
# Runs both API server (port 4000) and Next.js Web Dashboard (port 3000)
npm run dev
```

### Option B: Run Services Individually

```bash
# Terminal 1 - Backend API (http://localhost:4000)
npm run dev:api

# Terminal 2 - Frontend Dashboard (http://localhost:3000)
npm run dev:web
```

---

## 🔑 Admin Login Credentials (Phase 1 Demo)

Navigate to **http://localhost:3000/login**:

- **Email**: `admin@theatre.com`
- **Password**: `admin123`

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `GET` | `/api/health` | Health check & system diagnostics | No |
| `POST` | `/api/auth/login` | Administrator login & JWT generation | No |
| `GET` | `/api/auth/profile` | Current authenticated user profile | Yes (JWT) |
| `GET` | `/api/dashboard/stats` | Aggregated counts for theatres, screens, shows, etc. | Yes (JWT) |
| `GET` | `/api/dashboard/overview` | List of recent shows and registered theatres | Yes (JWT) |

---

## 🔒 Future Roadmap (Beyond Phase 1)

The Phase 1 architecture has been built in a modular fashion to support future phases without schema breaking changes:
- **Phase 2**: Dynamic, time-synced QR code generation with cryptographic signatures.
- **Phase 3**: Real-time scanner / turnstile ticket activation and verification pipeline.
- **Phase 4**: Forensic invisible watermarking and camera-blocking algorithms.
