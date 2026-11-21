# Beeline VoyageRail

> **Smart Romanian Rail & Multimodal Transit Planner & Booking System**  
> Enterprise-grade transit engine unifying national rail schedules, live CFR delays, machine-learning risk predictions, and seamless multi-operator ticketing.

---

## 🚆 System Overview

**Beeline VoyageRail** is a modern transit planning platform engineered for Romania's national rail network and urban transit connections. It aggregates all active Romanian passenger rail operators into a unified timetable and booking interface, backed by real-time delay telemetry and predictive risk analytics.

### Key Capabilities

- **100% Live Romanian Rail Routing**: Live timetable sync across all 7 national rail carriers (**CFR Călători**, **Regio Călători**, **Transferoviar Călători**, **Astra Trans Carpatic**, **Softrans**, **Interregional Călători**, **Ferotrafic TFI**) with zero fake or hallucinated connections.
- **Romanian Transfer Shield (ML Risk Engine)**: Sub-millisecond in-process ONNX ML inference serving LightGBM gradient-boosted decision trees to predict leg delays and calculate missed-connection probabilities.
- **InfoFer Real-Time Telemetry**: Real-time GPS delay integration via InfoFer and Transitous, surfacing live train delays, platform assignments, and timetable updates.
- **Trifecta Multi-Criteria Optimization**: Delivers 3 clean journey alternatives (`FASTEST`, `BEST_VALUE`, `MOST_RELIABLE`) plus the *Flora Award* badge for optimal economic choices.
- **Official Ticketing Integration**: Direct deep-links to official carrier ticketing portals, calculating exact fares and compartment availability (`STANDARD`, `FIRST`, `BUSINESS`, `SLEEPER`).
- **Cozy Hive Design System**: Warm golden-amber aesthetic with Barnaby the Bee mascot feedback, accessible responsive typography, and mobile-ready layouts.

---

## 🏛 Monorepo Architecture

```
.
├── backend/                  # FastAPI 0.115+ Async Backend & ML Serving
│   ├── app/
│   │   ├── api/v1/           # Versioned REST API routers (/auth, /routes, /trains, etc.)
│   │   ├── core/             # Configuration, Database engine, Security & Rate limiters
│   │   ├── ml_models/        # ONNX risk model & production inference bundle
│   │   ├── models/           # SQLAlchemy 2.0 async ORM entities
│   │   ├── schemas/          # Pydantic v2 validation contracts & schemas
│   │   └── services/         # Routing, Timetable sync, Auth, Email & Feature store
│   ├── scraper/              # Data collectors, XML timetable parser, InfoFer adapters
│   └── tests/                # Comprehensive Pytest test suite (>40 test modules)
│
├── frontend/                 # Next.js 16 (Turbopack) & React 19 Web Application
│   ├── public/               # Favicons, Web app manifest, Static assets
│   ├── src/
│   │   ├── app/              # App Router pages (/, /trips, /trains, /my-trip, /auth, etc.)
│   │   ├── components/       # Component system (BaseButton, RouteFinderCard, Navbar, etc.)
│   │   ├── context/          # TripContext, AuthContext, ThemeContext
│   │   ├── services/         # API client, Station autocomplete, Risk calculator
│   │   └── utils/            # Formatters, Ticket URL builders, Fingerprint generators
│   └── src/__tests__/        # Jest & React Testing Library suite (22 suites, 214 tests)
│
├── mobile/                   # React Native (Expo SDK 51) Cross-Platform Application
│   ├── app/                  # Expo Router mobile screens
│   ├── src/                  # Mobile UI components, theme, and contexts
│   └── __tests__/            # Mobile component & Storybook test suite
│
├── docs/                     # Centralized Project Documentation
│   ├── academic/             # BD2 University coursework, assignment PDF & AI log
│   ├── api/                  # REST API Specification (api.md)
│   ├── architecture/         # ADRs, Component specs, Freeze contract & Status plan
│   └── archive/              # Implementation history & legacy milestones
│
├── render.yaml               # Render Infrastructure-as-Code deployment blueprint
└── scripts/                  # Repository hygiene and verification scripts
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Node.js**: v20 or higher
- **Python**: v3.11 or higher
- **Redis**: v7+ (for rate limiting, online feature store, and session token rotation)

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/calibrixadv/PROIECT-BD2.git
cd "PROIECT BD2"

# Install root & frontend dependencies
npm install
npm --prefix frontend install

# Install Python backend dependencies
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
```

### 2. Environment Configuration

Copy the example environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Key environment variables:
- `ENVIRONMENT`: Set to `development` locally (enables Swagger UI at `/api/v1/docs`).
- `DATABASE_URL`: `sqlite+aiosqlite:///backend/beeline.db` (or PostgreSQL connection string).
- `REDIS_URL`: `redis://localhost:6379/0`.
- `SECRET_KEY`: 32+ character cryptographic secret for JWT authentication.

### 3. Launch Development Servers

You can start the frontend and backend using root npm scripts:

```bash
# Run Next.js frontend (http://localhost:3000)
npm run dev

# Run FastAPI backend (http://localhost:8000)
npm run backend
```

---

## 🚢 Production Deployment

The project is structured for cloud deployment:

### Backend & Data Tier: [Render](https://render.com)
The included `render.yaml` orchestrates:
- **Web Service (`beeline-api`)**: Python FastAPI container with Gunicorn/Uvicorn, health checks on `/health`, and automated HTTPS.
- **Redis (`beeline-redis`)**: High-performance in-memory cache for distributed session revocation, rate limits, and live routing cache.
- **PostgreSQL (`beeline-db`)**: Managed relational database storing user profiles, hashed credentials, and persistent itineraries.

> **Production Security Hardening**:
> When `ENVIRONMENT=production`, FastAPI automatically hides Swagger UI (`/api/v1/docs`), ReDoc (`/api/v1/redoc`), and OpenAPI schema (`/api/v1/openapi.json`), returning HTTP 404 to prevent API schema enumeration.

### Frontend: [Vercel](https://vercel.com)
- Connect repository root and configure Root Directory to `frontend`.
- Built automatically with Next.js Turbopack compiler (`next build`).
- Pre-renders static routes (`/`, `/trips`, `/trains`, `/my-trip`, `/profile`, `/login`, `/signup`).

---

## 🧪 Testing & Verification

Both frontend and backend are covered by automated test suites:

```bash
# Run Frontend Jest test suite (22 suites, 214 tests)
npm test

# Run Next.js production build verification
npm run build

# Run Backend Pytest suite
python3 -m pytest backend/tests -q
```

---

## 📚 Documentation Directory

Detailed documentation is organized under the [`docs/`](docs/) directory:

| Section | Description | Key Documents |
| :--- | :--- | :--- |
| **[Academic (BD2)](docs/academic/)** | Course deliverables for Advanced Databases (*Universitatea „Dunărea de Jos” din Galați*) | [PROJECT_DOCUMENTATION.md](docs/academic/PROJECT_DOCUMENTATION.md), [AI_LOG.md](docs/academic/AI_LOG.md), [BDII-1.pdf](docs/academic/BDII-1.pdf) |
| **[API Specification](docs/api/)** | Contract-first REST API specification, uniform error semantics, and endpoint matrix | [api.md](docs/api/api.md) |
| **[Architecture](docs/architecture/)** | Architecture decisions, UI component hierarchy, ML freeze contract, and delivery roadmap | [DECISIONS.md](docs/architecture/DECISIONS.md), [COMPONENTS.md](docs/architecture/COMPONENTS.md), [freeze_contract.md](docs/architecture/freeze_contract.md), [PLAN_AND_STATUS.md](docs/architecture/PLAN_AND_STATUS.md) |
| **[Archive](docs/archive/)** | Implementation milestones and development archive | [IMPLEMENTATION_HISTORY.md](docs/archive/IMPLEMENTATION_HISTORY.md) |

---

## 📄 License & Academic Integrity

Developed for academic evaluation in the Advanced Databases (BD2) curriculum, 2026–2027. All third-party timetable and telemetry data is sourced from open railway data protocols conforming to Romanian rail transit specifications.
