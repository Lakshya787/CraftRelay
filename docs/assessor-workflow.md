# CraftRelay — Assessor Review and Competency Verification (Part 6)

> Status: implemented and tested. The deterministic evidence states from Part 5
> remain the input; formal decisions are now persisted and audited.

## 1. What an assessor can do

1. Open the queue of submitted/under-review cases.
2. Inspect criterion-level evidence and accept or reject each evidence item.
   The assessor can also confirm or reject an individual evidence→criterion
   link, which controls whether that evidence feeds the deterministic engine.
3. Record the result of approved practical tasks.
4. Record a formal decision for every criterion (approved / rejected /
   additional evidence required) with a rationale and optional rubric result.
5. Issue the final qualification decision.

Only the final decision creates a `CompetencyVerification`. Uploading evidence,
accepting evidence, or recording a practical result never verifies a worker on
its own.

## 2. Endpoints

Base path: `/api/v1`

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET` | `/assessments/queue` | Assessor/Admin | Submitted and under-review cases |
| `PATCH` | `/evidence/{id}/review` | Assessor/Admin | Accept or reject one evidence item |
| `PATCH` | `/assessments/cases/{id}/mappings/{mappingId}/review` | Assessor/Admin | Confirm or reject an evidence→criterion link |
| `POST` | `/assessments/cases/{id}/criteria/{criterionId}/decision` | Assessor/Admin | Formal criterion decision |
| `POST` | `/assessments/cases/{id}/tasks/{taskId}/result` | Assessor/Admin | Practical-task result |
| `POST` | `/assessments/cases/{id}/final-decision` | Assessor/Admin | Approve or reject the qualification |
| `GET` | `/assessments/cases/{id}` | Owner/Assessor/Admin | Workspace including decisions, task results, blockers |
| `GET` | `/workers/me/verifications` | Worker | Own verifications (all statuses) |
| `GET` | `/workers/{id}/verifications` | Public | Verified competencies only |

Workers can read their own workspace but cannot call any review endpoint.
Customers cannot access assessment records.

## 3. Business rules enforced on the backend

### Evidence review
- Only `assessor` and `admin` roles.
- A rejection requires a note.
- Every review writes an `evidence.reviewed` audit entry.
- The engine immediately reflects accepted/rejected status.

### Evidence → criterion link review
- Only `assessor` and `admin` roles; a link from another case, criterion or
  worker returns 404.
- `confirmed` links count as evidence; `rejected` links are excluded from the
  deterministic engine without changing the evidence item's own review status.
- The decision records the assessor, an optional note and a
  `assessment.mapping_reviewed` audit entry.
- Frozen (approved/rejected/withdrawn) cases cannot have links reviewed.

### Criterion decision
- One row per `(assessment_case_id, criterion_id)`; a unique constraint prevents
  duplicates from repeated requests.
- An identical retry returns the existing decision (idempotent).
- Once a criterion is `approved` or `rejected`, a different decision is refused
  with HTTP 409.
- A decision of `additional_evidence_required` may be revised later (the same
  row is updated) after new evidence is accepted.
- Approving requires the engine state `READY_FOR_ASSESSOR_DECISION`:
  accepted evidence and, where a task is linked, a passing practical result.
- Approving with a `fail` rubric result is rejected.
- The decision stores assessor identity, timestamp, pinned qualification
  version, criterion, rubric result, decision, and rationale.
- The first assessor action moves a `submitted` case to `under_review`.

### Practical task result
- Only active, approved tasks for the case's qualification can be recorded.
- Pass/fail is computed server-side from `score >= task.pass_score`; the client
  cannot choose the threshold.
- One result per `(case, task)`; re-recording updates the same row.
- Scores above the task maximum are rejected.

### Final decision
- Only `submitted` or `under_review` cases.
- Approval requires an approved decision for **every mandatory criterion**, and
  each mandatory criterion must still evaluate as ready. Optional criteria do
  not compensate for a missing mandatory one.
- Approval creates (or reactivates) a `CompetencyVerification` with a
  certificate number, the case's pinned version, and the assessor's identity.
- Rejection closes the case without a verification.
- Final decisions are immutable; repeated requests return HTTP 409.
- The case and its audit entry are committed in one transaction. A duplicate
  verification is prevented by the `(worker, qualification)` unique constraint.

### Audit trail
The following append-only `audit_logs` actions are written in the same
transaction as the change:

- `evidence.reviewed`
- `assessment.mapping_reviewed`
- `assessment.criterion_decided`
- `assessment.task_result_recorded`
- `assessment.approved`
- `assessment.rejected`

## 4. Database changes

Migration `d8e1b7c3a2f4_assessor_workflow` (revises `c7d2a9f4b6e1`):

- creates `criterion_assessment_decisions` with a unique
  `(assessment_case_id, criterion_id)` constraint, assessor/version FKs,
  `rubric_result`, and `rationale`;
- adds `uq_assessment_result_case_task` to `assessment_results`.

Verified with Alembic on SQLite: `upgrade head` and `downgrade base` both pass.

## 5. Mobile

- `mobile/hooks/useAssessorWorkflow.ts` — queue/history/evidence review/
  criterion decision/task result/final decision hooks.
- `mobile/app/(assessor)/index.tsx` — real queue with filters and readiness.
- `mobile/app/(assessor)/review.tsx` — criterion review workspace:
  expandable evidence details (description, type, filename, URL link),
  evidence accept/reject, per-link confirm/reject, practical result entry,
  decision rationale, blocker
  list, and confirmation dialogs for the final decision. Locally stored files
  are not previewed in the app; they remain available through the authenticated
  download endpoint.
- `mobile/app/(assessor)/history.tsx` — approved/rejected cases from the API.
- The review route is hidden from the tab bar and opened from the queue with a
  `caseId` parameter.
- The worker profile shows a **Verified Competencies** section fed by
  `/workers/me/verifications`. Declared skills remain visually separate, so an
  unverified declaration is never presented as a formal competency.

The workspace response now includes `decisions`, `task_results`,
`approval_blockers`, `can_approve`, and `verification`.

## 6. Tests

`backend/tests/test_assessor_workflow.py` (8 tests) covers:

- only assessors can review evidence; customers/workers get 403;
- rejection requires a note; accepted evidence changes the engine state;
- rejected evidence yields `ADDITIONAL_EVIDENCE_REQUIRED`;
- evidence→criterion links can be rejected (removing the evidence from the
  engine) and confirmed again; workers are refused and foreign links 404;
- approval blocked while evidence is pending or the practical task is unpassed;
- failing practical result does not unlock approval;
- approved decision is idempotent and conflicting decisions are refused;
- `additional_evidence_required` can be revised to approved (single row);
- task pass is computed from score and repeated results update one row;
- mandatory criteria block final approval; worker/customer final decisions 403;
- approval creates exactly one verification and closes the case;
- rejection creates no verification;
- audit rows exist for evidence review and final approval.

Last verified result: **60 backend tests passed** (53 from Parts 1–5 + 7 new).

Mobile verification:

- `npm run typecheck` → exit 0
- `npx expo export --platform android` → Android bundle exported successfully

## 7. Decisions and limitations

- **One decision row, revised only from `additional_evidence_required`.** This
  satisfies "no duplicate decisions" while allowing the common request-evidence
  loop. Approved/rejected decisions are immutable; a future admin override would
  need an explicit supersede model.
- **Criterion approval uses the Part 5 engine state.** This keeps one source of
  truth for evidence/practical readiness and avoids duplicated rule logic.
- **Qualification-level verification only.** The existing
  `CompetencyVerification` model verifies the qualification; per-criterion
  decisions are the audit detail behind it.
- **No evidence reviewer assignment.** Any assessor can review any case. Case
  assignment (`assessor_id` is set on first action) is recorded but not enforced.
- **No certificate PDF or expiry workflow yet.** Certificate numbers are issued
  and stored; generation/download is future work.
- **Customer reviews cannot change competency status** because review endpoints
  do not accept customer roles; Part 7 will add service reviews separately.
