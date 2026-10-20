# CraftRelay — AI-Assisted Skill Assessment and Service Discovery Platform

> **Smart India Hackathon (SIH) Project**

CraftRelay connects skilled workers with customers seeking their services. Assessors verify workers' competencies through submitted evidence and practical tasks, while administrators manage reference data, user access, and audit records.

## Repository Layout

```text
craftrelay/
├── mobile/                  # Expo React Native app (TypeScript, Expo Router)
├── backend/                 # FastAPI Python API
├── data/                    # Fictional seed data (JSON/CSV)
├── docs/
│   ├── architecture/        # Architecture Decision Records (ADRs)
│   └── api/                 # OpenAPI supplement documentation
├── .gitignore
└── README.md
```

## Prerequisites

| Tool | Minimum Version | Notes |
|---|---|---|
| Node.js | 18 LTS | Node.js 22 recommended |
| npm | 9+ | Included with Node.js |
| Python | 3.10+ | System installation or virtual environment |
| Git | 2.40+ | Required for version control |
| Expo Go | Latest | For previewing the app on a physical Android device |
| Android Studio | Hedgehog or later | Required for an Android emulator |
| PostgreSQL | 15+ | Required starting from Part 2 |

## Quick Start — Windows PowerShell

### 1. Clone the Repository

Replace `<repo-url>` with the actual repository URL.

```powershell
git clone <repo-url> craftrelay
Set-Location craftrelay
```

### 2. Set Up the Backend

Navigate to the backend directory:

```powershell
Set-Location backend
```

Create and activate a Python virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install the dependencies:

```powershell
python -m pip install -r requirements.txt
```

Create the environment file:

```powershell
Copy-Item .env.example .env
```

Update `.env` with the appropriate local configuration.

Start the development server:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Verify the backend**

- Health check: http://localhost:8000/api/v1/health
- Interactive API documentation: http://localhost:8000/docs

**Run backend tests**

Open a separate PowerShell terminal, activate the virtual environment, and run:

```powershell
python -m pytest tests/ -v
```

### 3. Set Up the Mobile App

Open a new PowerShell terminal and navigate to the mobile directory from the repository root:

```powershell
Set-Location mobile
```

Install dependencies:

```powershell
npm install
```

Create the mobile environment file:

```powershell
Copy-Item .env.example .env
```

Configure the API base URL in `.env` before launching the app.

Start Expo:

```powershell
npx expo start
```

**Run the app**

- **Android emulator:** Press `a` in the Expo terminal.
- **Physical Android device:** Scan the QR code using Expo Go.
- **Web browser:** Press `w`, if web support is configured.

> **Important:** On a physical Android device, `localhost` refers to the device itself, not your computer. Set the API URL to your computer's LAN IP address (for example, `http://192.168.1.10:8000`) and ensure both devices are on the same network. For an Android emulator, the usual host address is `http://10.0.2.2:8000`.

## Environment Variables

| Directory | Configuration File | Purpose |
|---|---|---|
| `backend/` | `.env.example` → `.env` | FastAPI settings, database connection, and secrets |
| `mobile/` | `.env.example` → `.env` | Public Expo configuration, including the API base URL |

Never commit `.env` files or real credentials to version control. Ensure they are covered by `.gitignore`.

Only variables prefixed with `EXPO_PUBLIC_` should be used for client-side Expo configuration. Never put secrets in these variables because their values can be bundled into the app.

## Naming Conventions

### Backend — Python

| Item | Convention | Example |
|---|---|---|
| Files and modules | `snake_case` | `skill_service.py` |
| Classes | `PascalCase` | `SkillAssessment` |
| Functions and variables | `snake_case` | `get_worker_by_id` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT` |
| Pydantic schemas | `PascalCase` with descriptive suffixes | `WorkerCreateRequest`, `SkillResponse` |
| Database tables | Plural `snake_case` | `skill_assessments` |

### Mobile — TypeScript

| Item | Convention | Example |
|---|---|---|
| Component files | `PascalCase` | `WorkerCard.tsx` |
| Utility files | `camelCase` | `apiClient.ts` |
| React components | `PascalCase` | `SkillBadge` |
| Custom hooks | `useCamelCase` | `useWorkerProfile` |
| Types and interfaces | `PascalCase` | `Worker`, `SkillLevel` |
| Constants | `UPPER_SNAKE_CASE` | `API_BASE_URL` |
| Expo Router route files | Follow the route naming convention | `skill-detail.tsx` |

## API Response Conventions

The API is intended to use three response envelope formats. Confirm that individual endpoints follow these conventions.

### Success Response

```json
{
  "success": true,
  "data": {
    "id": 1
  },
  "message": "Request completed successfully"
}
```

### Error Response

```json
{
  "success": false,
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ],
  "message": "Validation failed"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [],
  "total": 42,
  "page": 1,
  "page_size": 20,
  "has_next": true,
  "has_previous": false
}
```

## Assessment Engine (Part 5)

The deterministic evidence-gap-to-task engine lives in
`backend/app/services/assessment_engine.py` and is exposed under
`/api/v1/assessments`.

### Criterion states

| State | Meaning |
|---|---|
| `GAP` | No evidence is linked to the criterion. |
| `PENDING_REVIEW` | Evidence is linked but not yet accepted by an assessor. |
| `ADDITIONAL_EVIDENCE_REQUIRED` | All linked evidence was rejected. |
| `PRACTICAL_VERIFICATION_REQUIRED` | Evidence is accepted but the linked approved practical task has not passed. |
| `READY_FOR_ASSESSOR_DECISION` | Evidence and any required practical task are complete — an assessor must still decide. |
| `VERIFIED` | Formal state only, issued by an authorised assessor decision (Part 6). Never produced by evidence evaluation. |

### Endpoints

| Method | Path | Who |
|---|---|---|
| `POST` | `/assessments/cases` | Worker (opens or reuses a case pinned to the latest qualification version) |
| `GET` | `/assessments/cases` | Worker (own), assessor/admin (all) |
| `GET` | `/assessments/queue` | Assessor/admin |
| `GET` | `/assessments/cases/{id}` | Case owner, assessor, admin |
| `POST` | `/assessments/cases/{id}/submit` | Case owner |
| `GET` | `/assessments/cases/{id}/mapping-suggestions` | Case owner, assessor, admin |
| `POST` | `/assessments/cases/{id}/mappings` | Case owner, assessor, admin |
| `DELETE` | `/assessments/cases/{id}/mappings/{mappingId}` | Case owner, assessor, admin |
| `GET` | `/assessments/cases/{id}/recommendations` | Case owner, assessor, admin |

Mapping suggestions use deterministic keyword normalisation and lexical
similarity. The score is a ranking signal in `[0, 1]`, never a probability of
competence. Criterion IDs are validated against the qualification version
pinned to the case; unknown or foreign IDs are rejected with HTTP 422.

Only approved, active tasks that carry a rubric reference and reference an
unresolved criterion are recommended. The worker app shows this workflow on the
**Assessment** tab (`mobile/app/(worker)/assessment.tsx`).

See [`docs/assessment-engine.md`](docs/assessment-engine.md) for the full rules,
decisions, and test map.

## Assessor Workflow (Part 6)

Assessors review submitted cases, accept or reject evidence (and the
evidence→criterion links feeding the engine), record practical results, and
make criterion-level decisions. Only the final decision creates a
`CompetencyVerification`.

| Method | Path | Who |
|---|---|---|
| `GET` | `/assessments/queue` | Assessor/admin |
| `PATCH` | `/evidence/{id}/review` | Assessor/admin |
| `PATCH` | `/assessments/cases/{id}/mappings/{mappingId}/review` | Assessor/admin |
| `POST` | `/assessments/cases/{id}/criteria/{criterionId}/decision` | Assessor/admin |
| `POST` | `/assessments/cases/{id}/tasks/{taskId}/result` | Assessor/admin |
| `POST` | `/assessments/cases/{id}/final-decision` | Assessor/admin |

Non-negotiable controls enforced server-side: workers cannot review their own
evidence or approve competencies; customers cannot touch assessment results;
mandatory criteria cannot be skipped or offset by optional ones; a passing
practical result and accepted evidence are required before a criterion can be
approved; repeated decisions are idempotent or rejected; every formal change is
written to the audit log in the same transaction.

See [`docs/assessor-workflow.md`](docs/assessor-workflow.md) for the full rules,
state transitions, and test map.

## User Roles

| Role | Key Responsibilities |
|---|---|
| **Worker** | Declare skills, submit evidence, track assessments, and receive service requests |
| **Assessor** | Evaluate evidence, conduct practical assessments, and approve or reject competencies |
| **Customer** | Discover verified workers, request services, and submit reviews |
| **Admin** | Manage qualifications, assessment tasks, users, and audit records |

## Development Roadmap

| Phase | Focus | Status |
|---|---|---|
| Part 1 | Project foundation, monorepo setup, health check, and Expo startup | Completed |
| Part 2 | Mobile UI, navigation, and design system | Completed |
| Part 3 | Database models, migrations, JWT auth, and role-based access | Completed |
| Part 4 | Worker profiles, evidence upload/storage, and qualification catalogue | Completed |
| Part 5 | Deterministic evidence-gap engine, task recommender, and assessment workspace | Completed |
| Part 6 | Assessor review workflow and formal competency verification | Completed |
| Part 7 | Customer discovery, service requests, and reviews | Next |
| Part 8 | Optional AI-assisted mapping with deterministic fallback | Planned |
| Part 9 | Offline drafts, security review, and end-to-end testing | Planned |
| Part 10 | Final polish, Android APK, and SIH demo script | Planned |

## Current Limitations — Through Part 6

- **Customer screens:** Discovery, worker details, requests, and account still use mock data. They are wired to the marketplace API in Part 7.
- **Certificate artefacts:** Verification records and certificate numbers are issued, but no PDF/certificate download or expiry workflow exists yet.
- **Assessor assignment:** The first acting assessor is recorded, but cases are not exclusively assigned to one assessor.
- **Decision revisions:** A criterion approved or rejected is immutable; only an `additional_evidence_required` decision can be revised. A formal override flow is future work.
- **AI assistance:** Not implemented. Parts 5–6 use deterministic rules only.
- **Offline drafts:** Not implemented yet (Part 9).
- **Chat/realtime:** Not in scope.
- **Platform support:** Android is the primary target. iOS development and native builds require macOS.
- **Test database:** The suite runs on SQLite. PostgreSQL-specific behaviour (JSONB, native enums) is exercised only when running against a real PostgreSQL instance.

## Project Goal

CraftRelay aims to make practical skills more discoverable and verifiable by combining competency assessment, evidence-based verification, and service discovery in a mobile-first platform.
