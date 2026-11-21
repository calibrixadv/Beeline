# Beeline VoyageRail Documentation Library

Welcome to the centralized documentation directory for **Beeline VoyageRail**, an enterprise multimodal and rail transit booking platform engineered for Romania.

---

## Directory Map

```
docs/
├── academic/                 # Academic & Course Submission Materials (BD2)
│   ├── AI_LOG.md             # AI Assistant Usage Log & Manual Error Corrections
│   ├── BDII-1.pdf            # Course Project Specification & Academic Requirements
│   └── PROJECT_DOCUMENTATION.md # Project Documentation (Etapa 0, 1, 2)
│
├── api/                      # REST API & Integration Contracts
│   └── api.md                # Full RESTful JSON API Specification (v1.0.0)
│
├── architecture/             # System Architecture & Technical Specifications
│   ├── COMPONENTS.md         # UI Component Hierarchy & Storybook Reference
│   ├── DECISIONS.md          # Architecture Decision Records (ADRs)
│   ├── freeze_contract.md    # Machine Learning Feature Freeze Contract (LightGBM/ONNX)
│   └── PLAN_AND_STATUS.md    # Master Architecture Plan & Implementation Status
│
└── archive/                  # Historical Logs & Deprecated Milestones
    └── IMPLEMENTATION_HISTORY.md # Complete Development & Architecture History
```

---

## Category Overviews

### 1. [Academic Documentation](academic/)
Materials prepared for the Advanced Databases (*Baze de Date II / BD2*) course at *Universitatea „Dunărea de Jos” din Galați*:
- **[PROJECT_DOCUMENTATION.md](academic/PROJECT_DOCUMENTATION.md)**: Comprehensive report detailing domain modeling (Etapa 0), relational schema & synthetic fixtures (Etapa 1), and CRUD operations, SQL triggers, views, and page documentation (Etapa 2).
- **[AI_LOG.md](academic/AI_LOG.md)**: Mandatory academic log cataloging prompt strategies, generated scaffolds, and manual bug fixes/corrective measures executed during development.
- **[BDII-1.pdf](academic/BDII-1.pdf)**: Official university project assignment specification.

### 2. [API Specification](api/)
- **[api.md](api/api.md)**: Complete contract-first REST API specification covering Uniform Error Semantics, Idempotency protocol (`Idempotency-Key`), Authentication (`/auth`, `/users`), Route Planning (`/routes`), Train Timetables & Live Departures (`/trains`), Station Directory (`/stations`), Bookings (`/bookings`), and Disruptions (`/disruptions`).

### 3. [Architecture & Technical Specifications](architecture/)
- **[DECISIONS.md](architecture/DECISIONS.md)**: Architectural Decision Records detailing technology selection, schema constraints, ONNX serving, and dual-layer caching.
- **[COMPONENTS.md](architecture/COMPONENTS.md)**: Frontend Component Extension Pattern documentation, hierarchy trees, interaction states, and accessibility standards.
- **[freeze_contract.md](architecture/freeze_contract.md)**: Feature engineering contract specifying deterministic data inputs, topological flags, weather attributes, and ground truth labels for the machine learning models.
- **[PLAN_AND_STATUS.md](architecture/PLAN_AND_STATUS.md)**: Master architecture plan, milestone checklists, and production verification criteria.

### 4. [Archive](archive/)
- **[IMPLEMENTATION_HISTORY.md](archive/IMPLEMENTATION_HISTORY.md)**: Chronological evolution of the project from early prototypes to the production release.
