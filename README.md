# CraftRelay - AI-Assisted Skill Assessment and Service Discovery Platform

> Smart India Hackathon (SIH) Project

CraftRelay connects workers who hold trade skills with customers who need those skills,
mediated by assessors who verify competency through evidence and practical tasks.
An admin manages the system reference data and audit trail.

---

## Repository Layout

`
ps2/                        <- monorepo root
|-- mobile/                 <- Expo React Native app (TypeScript, Expo Router)
|-- backend/                <- FastAPI Python API
|-- data/                   <- Fictional seed data (JSON/CSV)
|-- docs/
|   |-- architecture/       <- Architecture decision records (ADRs)
|   `-- api/               <- OpenAPI supplement docs
|-- .gitignore
`-- README.md              <- this file
`

---

## Prerequisites

| Tool            | Minimum Version | Notes                              |
|-----------------|-----------------|------------------------------------|
| Node.js         | 18 LTS          | v22 recommended                    |
| npm             | 9+              | ships with Node                    |
| Python          | 3.10+           | system or venv                     |
| Git             | 2.40+           |                                    |
| Expo Go app     | latest          | Android phone for quick preview    |
| Android Studio  | Hedgehog+       | for Android emulator               |
| PostgreSQL      | 15+             | only needed from Part 2 onward     |

---

## Quick Start (Windows PowerShell)

### 1 - Clone and enter the repo

`powershell
git clone <repo-url> craftrelay
Set-Location craftrelay
`

### 2 - Backend

`powershell
Set-Location backend

# Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Copy the environment template and edit it
Copy-Item .env.example .env

# Start the development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
`

Verify: open http://localhost:8000/api/v1/health

Run backend tests:

`powershell
python -m pytest tests/ -v
`

### 3 - Mobile

`powershell
Set-Location ..\mobile

npm install

Copy-Item .env.example .env

npx expo start
`

- Press a to open Android emulator
- Scan QR code with Expo Go on physical Android
- Press w to open in web browser

---

## Environment Variables

| Location   | File                      | Purpose                            |
|------------|---------------------------|------------------------------------|
| backend/   | .env.example -> .env      | FastAPI settings (DB, secrets)     |
| mobile/    | .env.example -> .env      | Expo public API URL                |

Never commit .env files. They are listed in .gitignore.

---

## Naming Conventions

### Backend (Python)

| Item                | Convention          | Example                            |
|---------------------|---------------------|------------------------------------|
| Files / modules     | snake_case          | skill_service.py                   |
| Classes             | PascalCase          | SkillAssessment                    |
| Functions/variables | snake_case          | get_worker_by_id                   |
| Constants           | UPPER_SNAKE         | MAX_RETRY_COUNT                    |
| Pydantic schemas    | PascalCase + suffix | WorkerCreateRequest, SkillResponse |
| DB tables           | snake_case plural   | skill_assessments                  |

### Mobile (TypeScript)

| Item                     | Convention  | Example          |
|--------------------------|-------------|------------------|
| Component files          | PascalCase  | WorkerCard.tsx   |
| Utility files            | camelCase   | apiClient.ts     |
| Components               | PascalCase  | SkillBadge       |
| Hooks                    | useCamelCase| useWorkerProfile |
| Types / Interfaces       | PascalCase  | Worker, SkillLevel|
| Constants                | UPPER_SNAKE | API_BASE_URL     |
| Route files (Expo Router)| kebab-case  | skill-detail.tsx |

---

## API Response Conventions

All API responses use one of three envelope types:

Success:
  { "success": true, "data": { ... }, "message": "optional" }

Error:
  { "success": false, "errors": [{ "field": "email", "message": "..." }], "message": "..." }

Paginated:
  { "success": true, "data": [...], "total": 42, "page": 1, "page_size": 20,
    "has_next": true, "has_previous": false }

---

## Four Roles

| Role      | Key Abilities                                                          |
|-----------|------------------------------------------------------------------------|
| Worker    | Declare skills, submit evidence, track assessments, receive requests   |
| Assessor  | Evaluate evidence, conduct practical tasks, approve/reject competencies|
| Customer  | Discover verified workers, request services, leave reviews             |
| Admin     | Manage qualifications, tasks, users, audit records                     |

---

## Part Roadmap

| Part          | Focus                                                      |
|---------------|------------------------------------------------------------|
| Part 1 (done) | Project foundation - monorepo, health check, Expo boots    |
| Part 2        | Database models, Alembic migrations, seed data             |
| Part 3        | Auth (JWT), Worker & Assessor flows (API + screens)        |
| Part 4        | AI skill-gap detection, evidence upload                    |
| Part 5        | Customer discovery, service requests, review system        |
| Part 6        | Admin dashboard, audit trail, production hardening         |

---

## Known Limitations (Part 1)

- No database connection yet (health endpoint is DB-free intentionally).
- No authentication implemented.
- No AI integration.
- Android emulator only (iOS requires macOS).
- PostgreSQL setup is documented but not enforced until Part 2.
