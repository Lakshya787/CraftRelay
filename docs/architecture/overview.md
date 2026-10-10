# CraftRelay — Architecture Overview

## System Architecture (Part 1 Baseline)

```
┌────────────────────────────────────────────────────────────────────┐
│                          MOBILE CLIENT                             │
│              React Native · Expo SDK 57 · TypeScript               │
│              Expo Router (file-based routing)                       │
│  ┌──────────┐  ┌─────────────────┐  ┌──────────────────────────┐  │
│  │ Screens  │  │  TanStack Query │  │  lib/apiClient.ts        │  │
│  │ (app/)   │  │  (Part 3+)      │  │  fetch wrapper + types   │  │
│  └──────────┘  └─────────────────┘  └──────────────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────────────────────────────┐  │
│  │ Expo SecureStore│  │ Expo SQLite (offline drafts — Part 4+)  │  │
│  │ (JWT tokens)    │  │                                         │  │
│  └─────────────────┘  └─────────────────────────────────────────┘  │
└───────────────────────────┬────────────────────────────────────────┘
                            │  HTTPS / REST
                            │  JSON envelopes (SuccessResponse / ErrorResponse)
┌───────────────────────────▼────────────────────────────────────────┐
│                          BACKEND API                               │
│              FastAPI 0.115 · Python 3.10 · Uvicorn                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  app/api/v1/                                                 │  │
│  │  ├── health.py       GET /api/v1/health                      │  │
│  │  ├── auth.py         (Part 3)                                │  │
│  │  ├── workers.py      (Part 3)                                │  │
│  │  ├── assessors.py    (Part 3)                                │  │
│  │  ├── customers.py    (Part 5)                                │  │
│  │  └── admin.py        (Part 6)                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ app/core/    │  │ app/schemas/ │  │ app/services/            │  │
│  │ config.py    │  │ common.py    │  │ (Part 3+)                │  │
│  │ logging.py   │  │ (envelopes)  │  │                          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└───────────────────────────┬────────────────────────────────────────┘
                            │  SQLAlchemy 2.0 (async)
┌───────────────────────────▼────────────────────────────────────────┐
│                         DATABASE                                   │
│              PostgreSQL 15+ · Alembic migrations (Part 2)          │
└────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
ps2/
├── mobile/
│   ├── app/                     # Expo Router routes
│   │   ├── _layout.tsx          # Root layout
│   │   └── index.tsx            # Landing screen
│   ├── constants/
│   │   └── colors.ts            # Design tokens
│   ├── components/              # Reusable UI (Part 3+)
│   ├── hooks/                   # Custom React hooks (Part 3+)
│   ├── lib/
│   │   └── apiClient.ts         # HTTP client
│   ├── types/
│   │   └── api.ts               # Shared domain types
│   ├── app.json
│   ├── tsconfig.json
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── __init__.py      # Router aggregator
│   │   │   └── health.py        # GET /api/v1/health
│   │   ├── core/
│   │   │   ├── config.py        # pydantic-settings
│   │   │   └── logging.py       # Logging setup
│   │   ├── db/                  # SQLAlchemy base (Part 2)
│   │   ├── models/              # ORM models (Part 2)
│   │   ├── schemas/
│   │   │   └── common.py        # Response envelopes
│   │   ├── services/            # Business logic (Part 3+)
│   │   └── main.py              # FastAPI app factory
│   ├── tests/
│   │   ├── conftest.py
│   │   └── test_health.py
│   ├── requirements.txt
│   └── pyproject.toml
│
├── data/
│   └── seed/
│       ├── qualifications.json
│       └── approved_tasks.json
│
└── docs/
    └── architecture/
        └── overview.md          # this file
```

## Key Design Decisions

### 1. Monorepo without a build tool
Both `mobile/` and `backend/` live in the same repository under `ps2/`.
No Turborepo or Nx is used in Part 1 to keep the setup minimal.

### 2. API response envelopes
All endpoints return `{ success, data, message }` or `{ success, errors, message }`.
The mobile `apiClient.ts` unpacks `data` on success and throws `ApiError` on failure.
This means TanStack Query's `data` field is always the domain object — never an envelope.

### 3. Expo managed workflow
We use the Expo managed workflow (no `android/` or `ios/` directories committed).
This means native modules must be compatible with the current Expo SDK (57).

### 4. No fake auth in Part 1
Authentication is not stub-implemented. The app has a placeholder "Get Started" button
that will wire to the login screen in Part 3.

### 5. FastAPI lifespan (not on_event)
The startup/shutdown hooks use the modern `@asynccontextmanager lifespan` pattern
rather than the deprecated `@app.on_event`.

## API Naming Convention

| Verb | Path pattern | Example |
|------|-------------|---------|
| GET | /api/v1/{resources} | GET /api/v1/workers |
| GET | /api/v1/{resources}/{id} | GET /api/v1/workers/123 |
| POST | /api/v1/{resources} | POST /api/v1/workers |
| PUT | /api/v1/{resources}/{id} | PUT /api/v1/workers/123 |
| PATCH | /api/v1/{resources}/{id} | PATCH /api/v1/workers/123/skills |
| DELETE | /api/v1/{resources}/{id} | DELETE /api/v1/workers/123 |
