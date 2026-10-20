# CraftRelay — Comprehensive Project State & File-by-File Analysis Report

> **Smart India Hackathon (SIH) — CraftRelay Platform**  
> *AI-Assisted Skill Assessment and Service Discovery Platform for Vocational Trades*  
> *Date of Report:* October 2026

---

## Table of Contents

1. [Executive Summary & Milestone Progress](#1-executive-summary--milestone-progress)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [File-by-File Inventory & Detailed Analysis](#3-file-by-file-inventory--detailed-analysis)
   - [3.1 Repository Root & Documentation](#31-repository-root--documentation)
   - [3.2 Data Fixtures & Seed Data (`data/`)](#32-data-fixtures--seed-data-data)
   - [3.3 Backend API (`backend/`)](#33-backend-api-backend)
     - [Core Configuration & Infrastructure](#core-configuration--infrastructure)
     - [Database Layer & Portability](#database-layer--portability)
     - [Domain ORM Models](#domain-orm-models)
     - [API Schemas & Contracts](#api-schemas--contracts)
     - [API Endpoints (`app/api/v1/`)](#api-endpoints-appapiv1)
     - [Services & Business Logic](#services--business-logic)
     - [Migrations & Seed Scripts](#migrations--seed-scripts)
     - [Automated Backend Test Suite](#automated-backend-test-suite)
   - [3.4 Mobile Application (`mobile/`)](#34-mobile-application-mobile)
     - [App Shell & Navigation](#app-shell--navigation)
     - [Worker Experience](#worker-experience)
     - [Assessor Workspace](#assessor-workspace)
     - [Customer Discovery & Booking](#customer-discovery--booking)
     - [Admin Portal](#admin-portal)
     - [Custom Hooks & Client State](#custom-hooks--client-state)
     - [Networking & Secure Storage](#networking--secure-storage)
     - [UI Component Design System](#ui-component-design-system)
     - [Domain & API Types](#domain--api-types)
4. [Current Technical Debt & Attention Items](#4-current-technical-debt--attention-items)
5. [Roadmap for Part 5 (Evidence-Gap-to-Task Engine)](#5-roadmap-for-part-5-evidence-gap-to-task-engine)

---

## 1. Executive Summary & Milestone Progress

CraftRelay bridges informal trade skills (electricians, plumbers, carpenters, masons, HVAC technicians) and formal vocational certification. It replaces arbitrary subjective grading with a versioned, verifiable qualification framework and an automated evidence assessment workflow.

### Implementation Status by Milestone

| Milestone | Status | Key Deliverables & Achievements |
|---|---|---|
| **Part 1: Monorepo Foundation & Setup** | **Completed** | Full repository architecture (`backend/` + `mobile/`), FastAPI 0.115 factory, Expo Router structure, health endpoints, environment variable loading, and shared envelopes. |
| **Part 2: Database Schema & ORM Models** | **Completed** | 12 core PostgreSQL tables, Alembic migrations (`b1110b6c4588`, `a4f9c2e3b1d7`), cross-dialect JSONB support (SQLite fallback for fast test execution), immutable qualification versioning architecture (`QualificationVersion`), and audit logging. |
| **Part 3: Auth, Profiles & Skill Catalogue** | **Completed** | JWT authentication (Bearer tokens in SecureStore), bcrypt password hashing, role-based access control (`worker`, `assessor`, `customer`, `admin`), worker profile management, independent declared skills catalogue, and ownership protection. |
| **Part 4: Evidence Submission & Storage** | **Completed** | `StorageBackend` abstraction layer, non-public filesystem storage, server-side magic-byte MIME detection, file size limits (15 MB), multipart file upload, URL submission, and mobile capture screen (`evidence-submit.tsx`) with Expo Image Picker and progress feedback. |
| **Part 5: Evidence-Gap-to-Task Engine** | **Completed (engine, API, mobile workspace, tests)** | `services/assessment_engine.py` evaluates the five deterministic criterion states against a pinned qualification version, suggests version-bound mappings, and recommends only approved/rubric-backed tasks targeting unresolved criteria. `api/v1/assessments.py` exposes case creation/reuse, workspace, submission, suggestions, mappings and recommendations with ownership/role guards. Migration `c7d2a9f4b6e1` adds task criterion/rubric/approval fields and mapping provenance. Mobile Assessment tab wired via `hooks/useAssessments.ts`. 18 engine tests added. |
| **Part 6: Assessor Workflow & Verification** | **Completed (API, migration, mobile assessor screens, tests)** | Evidence accept/reject with review notes; per-link confirm/reject for evidence→criterion mappings; per-criterion decisions with unique `(case, criterion)` rows, pinned qualification version, rubric result, rationale and assessor identity; server-computed practical-task pass/fail; final decision enforces all mandatory criteria and creates `CompetencyVerification`; append-only audit entries for every formal action. Migration `d8e1b7c3a2f4`. Mobile queue/review/history screens now use the real API. 8 assessor tests added; full suite 61 passed. |

---

## 2. High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                             MOBILE CLIENT                              │
│              React Native · Expo SDK 57 · TypeScript · Expo Router     │
│  ┌───────────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │ Worker Workspace      │  │ Assessor Review │  │ Customer Portal  │  │
│  │ Profile, Skills, Evid │  │ Rubrics & Queue │  │ Search & Book    │  │
│  └───────────────────────┘  └─────────────────┘  └──────────────────┘  │
│  ┌────────────────────────────────────────────┐  ┌──────────────────┐  │
│  │ Hooks: useEvidence, useQualifications, etc.│  │ Expo SecureStore │  │
│  └────────────────────────────────────────────┘  └──────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ lib/apiClient.ts (Multipart upload, Bearer token injection)      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTPS / REST (Enveloped JSON)
┌────────────────────────────────────▼───────────────────────────────────┐
│                              BACKEND API                               │
│                   FastAPI 0.115 · Python 3.10 · Uvicorn                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Routers: /auth, /workers, /skills, /qualifications, /evidence    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ RBAC & CurrentUser Deps │  │ Storage Layer: Local / S3 / GCS     │  │
│  │ Server-side role check  │  │ Magic-byte detection, UUID storage  │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Upcoming: Deterministic Assessment Engine & Task Recommender     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ SQLAlchemy 2.0 Async (asyncpg / aiosqlite)
┌────────────────────────────────────▼───────────────────────────────────┐
│                              DATA LAYER                                │
│       PostgreSQL 15+ (Production) · SQLite in-memory (Tests)           │
│       Alembic Migrations · Immutable Versions · Append-Only Audit Logs │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. File-by-File Inventory & Detailed Analysis

### 3.1 Repository Root & Documentation

| File Path | Purpose & Responsibilities | Implementation Status |
|---|---|---|
| `README.md` | Master documentation for developers and evaluators: architecture summary, setup instructions for Windows PowerShell / POSIX, verification guides, and test instructions. | **Complete** |
| `.gitignore` | Excludes Python virtual environments, compiled bytecode, SQLite databases, Expo build output, and user evidence uploads. | **Complete** |
| `.gitattributes` | Enforces LF line-ending normalization across cross-platform environments. | **Complete** |
| `docs/architecture/overview.md` | Architectural Blueprint and Decision Records (ADRs) explaining client-server contracts, envelope schemas, storage isolation, and offline support strategy. | **Complete** |

---

### 3.2 Data Fixtures & Seed Data (`data/`)

| File Path | Purpose & Content | Implementation Status |
|---|---|---|
| `data/seed/qualifications.json` | Curated qualification standards modeled after NCVT / NSQF frameworks (Electrical L2, Plumbing L2, Carpentry L3, Masonry L2, HVAC L3). Includes codes, issuing body, levels, and core skill areas. | **Complete** |
| `data/seed/approved_tasks.json` | Practical assessment tasks (`ELE-L2-PT-01`, `PLM-L2-PT-01`, `CAR-L3-PT-01`) linked to qualifications with scoring rubrics (e.g. 70/100, 75/100 pass score), duration limits, and required tools. | **Complete** |

---

### 3.3 Backend API (`backend/`)

#### Core Configuration & Infrastructure

| File Path | Responsibilities | Status & Notes |
|---|---|---|
| `backend/app/main.py` | FastAPI application initialization, lifespan management, CORS middleware configuration, global unhandled exception handler, and API v1 router registration. | **Complete** |
| `backend/app/core/config.py` | Central `Settings` class using `pydantic-settings`. Loads environment variables for PostgreSQL DSNs, JWT secret key, storage directory, and CORS allowed origins. | **Complete** |
| `backend/app/core/security.py` | Password hashing using `passlib[bcrypt]` and JWT generation/validation using `python-jose` (HS256). Subject claims carry user UUID; roles are not trusted from tokens. | **Complete** |
| `backend/app/core/deps.py` | Dependency injection: `DbSession` (async DB session), `CurrentUser` (token validation + user DB fetch), `require_worker`, `require_assessor`, `require_admin`, and `require_worker_or_admin`. | **Complete** |
| `backend/app/core/logging.py` | Standardized logging setup with formatted outputs across modules. | **Complete** |

#### Database Layer & Portability

| File Path | Responsibilities | Status & Notes |
|---|---|---|
| `backend/app/db/base.py` | SQLAlchemy `Base` declarative class and `TimestampMixin` providing `created_at` and `updated_at`. | **Complete** |
| `backend/app/db/session.py` | Dual engine support: `async_engine` (`AsyncSessionLocal`) for async route handlers, and `sync_engine` (`SyncSessionLocal`) for Alembic and migration scripts. | **Complete** |
| `backend/app/db/types.py` | Custom `JSONBType` `TypeDecorator` that uses PostgreSQL `JSONB` in production and automatically falls back to standard `JSON` on SQLite during unit tests. | **Complete** |

#### Domain ORM Models (`backend/app/models/`)

| Model File | Key Entities Defined | Core Design Rationale |
|---|---|---|
| `app/models/user.py` | `User`, `UserRole` (`worker`, `assessor`, `customer`, `admin`) | Server-enforced role constraints; bcrypt password storage only; unique indexed emails. |
| `app/models/worker_profile.py` | `WorkerProfile` | One-to-one extension for workers holding trade title, bio, location, years of experience, rating, and availability. |
| `app/models/skill.py` | `Skill` | Standardized catalogue of trade skills categorized by trade. |
| `app/models/worker_skill.py` | `WorkerSkill`, `ProficiencyLevel` | Junction table for self-declared skills (`beginner`, `intermediate`, `advanced`, `expert`). Distinct from formal qualification verifications. |
| `app/models/qualification.py` | `Qualification`, `QualificationVersion` | **Immutable Versioning**: When standards change, past versions remain frozen so past certifications reflect the exact criteria active at decision time. Includes `is_illustrative` flag for demo transparency. |
| `app/models/competency.py` | `CompetencyCriterion`, `EvidenceItem`, `CriterionEvidenceMap`, `EvidenceType`, `EvidenceReviewStatus` | Links evidence to criteria; tracks server UUID storage names, client filenames, MIME types, file sizes, and review lifecycle (`pending`, `under_review`, `accepted`, `rejected`). |
| `app/models/assessment.py` | `AssessmentCase`, `ApprovedAssessmentTask`, `AssessmentResult`, `CompetencyVerification` | Manages formal assessment submissions, task scoring rubrics, passing thresholds, and permanent credential issuance. |
| `app/models/service.py` | `ServiceRequest`, `ServiceCompletion`, `CustomerReview` | Customer marketplace booking and job completion lifecycle. |
| `app/models/audit.py` | `AuditLog` | Append-only immutable log recording actor, action, resource type/ID, and JSONB event payload for regulatory transparency. |
| `app/models/__init__.py` | Package export | Ensures deterministic relationship resolution across all ORM models. |

#### API Schemas & Contracts (`backend/app/schemas/`)

| Schema File | Defined Schemas | Contract Purpose |
|---|---|---|
| `app/schemas/common.py` | `SuccessResponse[T]`, `ErrorResponse`, `ErrorDetail`, `PaginatedResponse[T]`, `HealthStatus` | Standardized JSON envelopes used across all endpoints for uniform client parsing. |
| `app/schemas/auth.py` | `RegisterRequest`, `LoginRequest`, `TokenResponse`, `UserResponse` | Input validation (prevents admin self-registration; validates password strength). |
| `app/schemas/worker.py` | `WorkerProfileResponse`, `WorkerSummaryResponse`, `WorkerProfileUpdateRequest` | Slim summary cards for search results; full details for profile management. |
| `app/schemas/skills.py` | `SkillResponse`, `WorkerSkillResponse`, `WorkerSkillDeclareRequest` | Input and response payloads for worker skill declarations. |
| `app/schemas/qualification.py`| `QualificationResponse`, `QualificationSummaryResponse`, `CriterionResponse` | Qualification listings with illustrative warnings and criteria rubrics. |
| `app/schemas/evidence.py` | `EvidenceItemResponse`, `EvidenceURLCreateRequest` | Evidence submission responses with review status and metadata. |

#### API Endpoints (`backend/app/api/v1/`)

| Endpoint File | Exposed Routes | Key Security & Logic |
|---|---|---|
| `app/api/v1/health.py` | `GET /health` | Unauthenticated system liveness check. |
| `app/api/v1/auth.py` | `POST /auth/register`<br>`POST /auth/login`<br>`GET /auth/me` | Handles registration, credential verification, and user profile retrieval. Automatically generates a blank `WorkerProfile` on worker registration. |
| `app/api/v1/workers.py` | `GET /workers`<br>`GET /workers/me`<br>`PATCH /workers/me`<br>`GET /workers/{id}` | Worker directory listing with trade/availability filters; strict ownership guard on `PATCH /workers/me` (workers can only update their own profile). |
| `app/api/v1/skills.py` | `GET /skills`<br>`GET /workers/me/skills`<br>`POST /workers/me/skills`<br>`DELETE /workers/me/skills/{id}` | Public skills list; worker skill declaration and removal. |
| `app/api/v1/qualifications.py` | `GET /qualifications`<br>`GET /qualifications/{id}`<br>`GET /qualifications/{id}/criteria` | Trade qualification browser; returns criteria ordered by sequence with illustrative warnings. |
| `app/api/v1/evidence.py` | `POST /evidence/upload`<br>`POST /evidence/url`<br>`GET /evidence/me`<br>`GET /evidence/{id}`<br>`DELETE /evidence/{id}`<br>`GET /evidence/{id}/download` | Multipart evidence file uploads; magic-byte MIME validation; UUID file keys; authenticated downloads restricted to owner or assessor. |

#### Services & Business Logic (`backend/app/services/`)

| Service File | Responsibilities | Implementation Status |
|---|---|---|
| `app/services/storage.py` | Protocol definition `StorageBackend`, concrete `LocalStorageBackend`, MIME type detection from magic bytes (JPEG, PNG, WebP, GIF, PDF, DOCX, XLSX, MP4, WebM), and storage directory isolation outside public web directories. | **Complete** |

#### Migrations & Seed Scripts

| Script Path | Purpose | Status |
|---|---|---|
| `alembic/versions/b1110b6c4588_initial_schema.py` | Creates initial 12 relational tables, foreign keys, indexes, and ENUM types. | **Complete** |
| `alembic/versions/a4f9c2e3b1d7_add_evidence_storage_and_catalogue.py` | Adds storage metadata columns to `evidence_items` and source references to `qualifications`. | **Complete** |
| `scripts/seed.py` | Seeds standard demo accounts (`worker@craftrelay.dev`, `assessor@craftrelay.dev`, etc.), worker profiles, declared skills, qualifications, and tasks. | **Complete** |
| `scripts/seed_catalogue.py` | Seeds reference qualification catalogue with full competency criteria. | **Complete** |

#### Automated Backend Test Suite (`backend/tests/`)

| Test File | Test Cases & Coverage | Status |
|---|---|---|
| `tests/conftest.py` | Async test fixtures; in-memory SQLite configuration; table creation and teardown per test. | **Passing** |
| `tests/test_health.py` | Verifies `GET /api/v1/health` returns status 200 and ok envelope. | **Passing** |
| `tests/test_auth.py` | Registration (happy path, duplicate email, invalid password, admin rejection), login, token decoding, and role guards. | **Passing** |
| `tests/test_workers.py` | Public worker listings, pagination, profile fetching, and profile ownership isolation. | **Passing** |
| `tests/test_qualifications.py` | Qualification catalogue listing, ID lookup, criteria ordering, and illustrative disclaimers. | **Passing** |

---

### 3.4 Mobile Application (`mobile/`)

#### App Shell & Navigation

| File Path | Description & Role | Current Status |
|---|---|---|
| `mobile/app/_layout.tsx` | Root Expo Router layout. Wraps entire component tree with `AuthProvider` and native status bar. | **Complete** |
| `mobile/app/index.tsx` | Platform landing screen presenting value proposition, role overviews, trust indicators, and authentication links. | **Complete** |
| `mobile/app/login.tsx` | User login screen with client-side email/password validation and role navigation. | **UI Complete** (Ready to wire to real `useAuth().login`) |
| `mobile/app/register.tsx` | User registration screen supporting worker and customer account creation. | **UI Complete** (Ready to wire to `apiClient.post("/auth/register")`) |

#### Worker Experience (`mobile/app/(worker)/`)

| File Path | Description & Features | Current Integration Status |
|---|---|---|
| `mobile/app/(worker)/_layout.tsx` | Worker navigation bar: Dashboard, Qualifications, Evidence Submission, and Profile. | **Complete** |
| `mobile/app/(worker)/profile.tsx` | Full worker profile editor. Fetches profile, updates bio/city/experience/availability, displays declared skills, opens modal to declare new skills from catalogue, and deletes declared skills. | **Real API Integrated** (`/workers/me`, `/workers/me/skills`) |
| `mobile/app/(worker)/qualifications.tsx` | Qualification catalogue browser. Trade filters (Electrical, Plumbing, Carpentry, etc.), expandable criterion cards, mandatory tags, official source links, and illustrative disclaimers. | **Real API Integrated** (`/qualifications`, `/qualifications/{id}/criteria`) |
| `mobile/app/(worker)/evidence-submit.tsx` | Evidence submission interface. Camera capture, gallery picker (`expo-image-picker`), URL link input, qualification criterion linking, real-time upload progress bar, and list of submitted evidence with review status badges. | **Real API Integrated** (`/evidence/upload`, `/evidence/url`, `/evidence/me`) |
| `mobile/app/(worker)/index.tsx` | Worker home dashboard showing profile completeness progress bar, quick actions, and assessment overview. | Uses mock data for metrics |
| `mobile/app/(worker)/jobs.tsx` | Service requests and assigned customer jobs list. | Uses mock data |

#### Assessor Workspace (`mobile/app/(assessor)/`)

| File Path | Description & Features | Current Status |
|---|---|---|
| `mobile/app/(assessor)/_layout.tsx` | Assessor tab navigation: Queue, Review, and History. | **Complete** |
| `mobile/app/(assessor)/index.tsx` | Pending assessment queue with status filters (`Pending`, `In Progress`, `Completed`). | Uses mock assessment queue |
| `mobile/app/(assessor)/review.tsx` | Detailed assessment review screen showing worker submitted evidence against rubrics with decision actions. | Ready for Part 5 engine connection |
| `mobile/app/(assessor)/history.tsx` | Historical record of past evaluations and verified awards. | Ready for Part 5 engine connection |

#### Customer Discovery & Booking (`mobile/app/(customer)/`)

| File Path | Description & Features | Current Status |
|---|---|---|
| `mobile/app/(customer)/_layout.tsx` | Customer tab navigation: Explore, Requests, and Account. | **Complete** |
| `mobile/app/(customer)/index.tsx` | Discovery feed allowing search for verified tradespeople by trade and location. | Uses mock worker directory |
| `mobile/app/(customer)/worker-detail.tsx`| Detailed worker profile showing verified competencies, badges, customer reviews, and booking button. | Uses mock worker profile |
| `mobile/app/(customer)/requests.tsx` | Tracks active customer service requests and booking status. | Uses mock requests |
| `mobile/app/(customer)/account.tsx` | Customer profile and account management. | Uses mock account state |

#### Admin Portal (`mobile/app/(admin)/`)

| File Path | Description & Features | Current Status |
|---|---|---|
| `mobile/app/(admin)/_layout.tsx` | Admin tab navigation: Overview, Assessments, Users, and Logs. | **Complete** |
| `mobile/app/(admin)/index.tsx` | High-level platform health metrics, active worker counts, and assessment volume. | Uses mock admin statistics |
| `mobile/app/(admin)/assessments.tsx`| Platform-wide assessment audit table. | Ready for real audit API |
| `mobile/app/(admin)/users.tsx` | User management and verification control. | Ready for real user API |
| `mobile/app/(admin)/logs.tsx` | Immutable audit log viewer displaying actor, action, and timestamp. | Ready for real audit API |

#### Custom Hooks & Client State (`mobile/hooks/`)

| Hook File | Exported Hooks & Responsibilities | Integration Status |
|---|---|---|
| `mobile/hooks/useWorkerProfile.ts` | `useWorkerProfile`: Loads profile via `GET /workers/me`, manages loading/error states, and updates profile via `PATCH /workers/me`. | **Real API Integrated** |
| `mobile/hooks/useWorkerSkills.ts` | `useWorkerSkills`, `useSkillCatalogue`, `useDeclareSkill`, `useRemoveSkill`: Manages worker declared skills and catalogue selection. | **Real API Integrated** |
| `mobile/hooks/useQualifications.ts`| `useQualifications`, `useQualificationDetail`: Fetches paginated qualifications and ordered criteria. | **Real API Integrated** |
| `mobile/hooks/useEvidence.ts` | `useMyEvidence`, `useSubmitFileEvidence`, `useSubmitURLEvidence`, `useDeleteEvidence`: Handles multipart uploads, URL submissions, and deletion. | **Real API Integrated** |

#### Networking & Secure Storage

| File Path | Description & Responsibilities | Status |
|---|---|---|
| `mobile/lib/apiClient.ts` | Central HTTP client wrapping `fetch`. Automatically attaches Bearer tokens from `Expo SecureStore`, handles multipart uploads without manual JSON encoding, and parses enveloped responses. | **Complete** |
| `mobile/context/AuthContext.tsx` | Authentication state provider. Persists tokens securely in device storage, validates session on launch via `GET /auth/me`, and provides `login()` and `logout()`. | **Complete** |

#### UI Component Design System (`mobile/components/`)

| Component | Category | Description |
|---|---|---|
| `components/ui/Button.tsx` | UI Primitive | Primary, secondary, outline, danger variants with loading spinner and disabled states. |
| `components/ui/Card.tsx` | UI Primitive | Elevated and outlined containers with uniform padding and border radius. |
| `components/ui/Badge.tsx` | UI Primitive | Status tags with semantic colors (`success`, `warning`, `danger`, `info`). |
| `components/ui/TextInput.tsx` | UI Primitive | Input field with label, error text, helper text, and focus states. |
| `components/ui/ProgressBar.tsx` | UI Primitive | Animated progress bar indicator. |
| `components/ui/Avatar.tsx` | UI Primitive | User initials or photo avatar. |
| `components/ui/EmptyState.tsx` | UI Primitive | Visual illustration and text when lists are empty. |
| `components/ui/ErrorState.tsx` | UI Primitive | Error display with retry button. |
| `components/ui/LoadingState.tsx` | UI Primitive | Full-screen and inline loading indicators. |
| `components/shared/CriterionCard.tsx`| Domain Component | Expandable card displaying competency criterion details and mandatory indicators. |
| `components/shared/EvidenceCard.tsx` | Domain Component | Displays evidence thumbnail/icon, title, criterion tag, and review status badge. |
| `components/shared/VerificationBadge.tsx`| Domain Component| Trust badge indicating formally verified competency. |
| `components/shared/WorkerCard.tsx` | Domain Component | Worker profile card for search and discovery lists. |

#### Domain & API Types (`mobile/types/`)

| File Path | Description | Status |
|---|---|---|
| `mobile/types/api.ts` | TypeScript interfaces mirroring backend common envelope schemas. | **Complete** |
| `mobile/types/domain.ts` | Canonical domain models (`User`, `WorkerProfile`, `Qualification`, `CompetencyCriterion`, `EvidenceItem`, `AssessmentCase`). | **Complete** |

---

## 4. Current Technical Debt & Attention Items

1. **FastAPI HTTP 204 Route Handling**:
   * Newer versions of FastAPI assert that endpoints returning `status_code=204` must have `response_class=Response` and return an empty `Response(status_code=204)` (preventing automatic JSON body serialization). This was addressed on `DELETE /evidence/{id}` and `DELETE /workers/me/skills/{id}`.
2. **Mobile Auth Screen Hookup**:
   * `mobile/context/AuthContext.tsx` and `mobile/lib/apiClient.ts` have full real JWT and SecureStore token persistence.
   * `mobile/app/login.tsx` and `register.tsx` currently contain a timer simulation from Part 2. Connecting them directly to `useAuth().login(email, password)` and `apiClient.post("/auth/register")` will complete end-to-end device authentication.
3. **Assessor & Customer Screen API Integration**:
   * While the worker flows (`profile.tsx`, `qualifications.tsx`, `evidence-submit.tsx`) are wired to real API endpoints, the assessor (`review.tsx`) and customer screens still pull from `mobile/data/mockData.ts`. They will be integrated during Part 5 and Part 6.

---

## 5. Roadmap for Part 5 (Evidence-Gap-to-Task Engine)

Part 5 implements CraftRelay's central innovation: **The Deterministic Evidence-Gap-to-Task Engine**.

### Engine Workflow & Business Rules

```
1. Worker declares a skill & selects a target qualification.
2. System retrieves the immutable QualificationVersion snapshot.
3. Submitted evidence is linked to individual criteria.
4. Engine deterministically evaluates criterion states:
   - No evidence linked                    → GAP
   - Evidence awaiting assessor review     → PENDING_REVIEW
   - Inadequate or rejected evidence       → ADDITIONAL_EVIDENCE_REQUIRED
   - Practical verification missing        → PRACTICAL_VERIFICATION_REQUIRED
   - Complete evidence                     → READY_FOR_ASSESSOR_DECISION
5. Unresolved criteria are isolated.
6. Approved practical tasks linked to unresolved criteria are recommended.
7. Formal verification is granted ONLY through an authorized assessment decision.
```

### Deliverables for Part 5

1. **Backend Engine Service (`backend/app/services/assessment_engine.py`)**:
   * Deterministic keyword normalization and lexical similarity mapping.
   * Rejection of nonexistent criterion IDs.
   * Curated task recommendation linked strictly to unresolved criteria.
2. **Assessment API Endpoints (`backend/app/api/v1/assessments.py`)**:
   * `POST /assessments/evaluate`: Evaluate criteria gaps for a worker and qualification.
   * `GET /assessments/{case_id}/recommendations`: Retrieve approved practical tasks for unresolved criteria.
   * `POST /assessments/{case_id}/decision`: Assessor authorization for formal verification.
3. **Mobile Assessment Workspace**:
   * Visual display of criterion-level statuses, gap indicators, and recommended practical tasks.
4. **Comprehensive Test Suite (`backend/tests/test_assessment_engine.py`)**:
   * Tests for missing evidence, pending review, rejected evidence, mandatory criteria, invalid criterion IDs, and unauthorized verification attempts.
