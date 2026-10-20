# CraftRelay — Deterministic Evidence-Gap-to-Task Engine (Part 5)

> Status: implemented and tested. Formal verification remains Part 6.

## 1. Purpose

The engine turns a worker's submitted evidence into criterion-level assessment
states and recommends approved practical tasks for the criteria that are still
unresolved. It is deliberately deterministic: the same database rows and rules
always produce the same output. No LLM is involved in this phase.

Core workflow implemented:

```
Worker declares skill → selects qualification → case pinned to latest version
→ evidence linked to criteria → criterion states evaluated
→ unresolved criteria isolated → approved tasks recommended
```

Formal verification is **not** part of this engine. It can only be recorded by
an authorised assessor decision in Part 6.

## 2. Source of truth and versioning

- `AssessmentCase.qualification_version_id` is set when the case is opened and
  never changes.
- The version snapshot stores the criterion codes that applied at publish time.
- The engine evaluates only criteria whose codes appear in that snapshot. If a
  snapshot criterion code has no matching `competency_criteria` row, the code is
  returned in `missing_snapshot_codes` rather than silently ignored.
- A case reuses an existing open case (`draft`, `submitted`, `under_review`) for
  the same worker and qualification instead of creating duplicates.

## 3. Criterion states

| State | Rule |
|---|---|
| `GAP` | No evidence is linked to the criterion. |
| `PENDING_REVIEW` | Evidence is linked, none is accepted, and at least one is `pending`/`under_review`. |
| `ADDITIONAL_EVIDENCE_REQUIRED` | Evidence is linked, none is accepted, and all linked evidence is `rejected`. |
| `PRACTICAL_VERIFICATION_REQUIRED` | At least one evidence item is accepted, the criterion is covered by an approved task, and no passing `AssessmentResult` for that task exists on the case. |
| `READY_FOR_ASSESSOR_DECISION` | At least one evidence item is accepted and any linked practical task has passed (or no task is linked). |
| `VERIFIED` | Reserved for an authorised assessor decision. The engine never emits it. |

Additional rules:

- **Conflicting evidence** (accepted + rejected) is surfaced in `conflicts[]`
  and does not silently discard the rejection.
- **Pending evidence alongside accepted evidence** is reported in `conflicts[]`
  but does not block readiness; the assessor sees both.
- **Mandatory criteria** never get special leniency. `mandatory_blockers`
  lists unresolved mandatory criteria, and `readiness` becomes
  `MANDATORY_GAPS_REMAIN`.
- **Optional gaps** produce `GAPS_REMAIN` without mandatory blockers.
- An empty set of criteria produces `NO_CRITERIA`.

Readiness labels: `NO_CRITERIA`, `MANDATORY_GAPS_REMAIN`, `GAPS_REMAIN`,
`READY_FOR_ASSESSOR_DECISION`.

## 4. Deterministic mapping suggestions

`app/services/assessment_engine.py::suggest_criterion_mappings`

1. Normalise evidence and criterion text: lowercase, `[a-z0-9]+` tokens, drop
   stopwords, apply a small suffix-stripping stem.
2. Score each evidence × criterion pair with
   `0.5 * Jaccard + 0.5 * containment` over token sets.
3. Keep the top 3 suggestions per evidence item above `MATCH_THRESHOLD = 0.10`.
4. Each suggestion returns:
   - `criterion_id` (validated against the pinned version)
   - `qualification_version_id` and version number
   - `evidence_item_id`
   - `supporting_text` (evidence excerpt)
   - `match_explanation` (shared normalised terms + "ranking signal only")
   - `match_score` in `[0, 1]`
   - `mapping_status` (`SUGGESTED` / `ALREADY_MAPPED`)
   - `requires_assessor_review: true`

Scores are **ranking signals, not probabilities of competence**.

### Confirming a link

`POST /assessments/cases/{id}/mappings` validates:

- the criterion exists, belongs to the case's qualification, and is present in
  the pinned version (HTTP 422 otherwise);
- the evidence exists and belongs to the case's worker (HTTP 403 otherwise);
- the case is not closed;
- duplicate links are idempotent (returns the existing mapping).

If a client requests `mapping_source = "suggested"` but the server-computed
score is below the threshold, the mapping is stored as `manual` with an
explanatory note — the record never claims to be an accepted suggestion that the
engine did not produce.

## 5. Task recommendations

`app/services/assessment_engine.py::_recommend`

A task is recommended only when all of the following hold:

- `is_approved = true`
- `is_active = true`
- `rubric_reference` is present
- `criterion_codes` is non-empty and intersects the unresolved criteria
- at least one targeted criterion is still unresolved

Recommendations are sorted by number of unresolved criteria addressed, then by
task code. Each recommendation includes `addresses_criterion_codes` and a
human-readable reason. The engine never invents a task, rubric, pass threshold,
or qualification code.

## 6. API

Base path: `/api/v1/assessments`

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/cases` | Worker | Opens/reuses a case; body `{qualification_id, worker_statement?}` |
| `GET` | `/cases` | Worker/Assessor/Admin | Worker sees own; assessor/admin see all. `status` filter. |
| `GET` | `/queue` | Assessor/Admin | Cases in `submitted` or `under_review` |
| `GET` | `/cases/{id}` | Case owner/Assessor/Admin | Full workspace with criterion states |
| `POST` | `/cases/{id}/submit` | Case owner | `draft → submitted`; idempotent |
| `GET` | `/cases/{id}/mapping-suggestions` | Case owner/Assessor/Admin | Deterministic suggestions |
| `POST` | `/cases/{id}/mappings` | Case owner/Assessor/Admin | Link evidence to criterion |
| `DELETE` | `/cases/{id}/mappings/{mappingId}` | Case owner/Assessor/Admin | Remove a link |
| `GET` | `/cases/{id}/recommendations` | Case owner/Assessor/Admin | Approved tasks for unresolved criteria |

Workers cannot access the assessor queue. Customers cannot access assessment
records. Workers cannot read or modify another worker's case, or link another
worker's evidence.

Workspace response (abridged):

```json
{
  "success": true,
  "data": {
    "id": "...",
    "qualification_code": "ELE-L2",
    "qualification_version_id": "...",
    "qualification_version_number": 1,
    "status": "draft",
    "readiness": "MANDATORY_GAPS_REMAIN",
    "status_counts": {
      "GAP": 4,
      "PENDING_REVIEW": 1,
      "ADDITIONAL_EVIDENCE_REQUIRED": 0,
      "PRACTICAL_VERIFICATION_REQUIRED": 0,
      "READY_FOR_ASSESSOR_DECISION": 0,
      "VERIFIED": 0
    },
    "criteria": [
      {
        "criterion_id": "...",
        "code": "ELE-L2-C01",
        "is_mandatory": true,
        "status": "PENDING_REVIEW",
        "explanation": "1 evidence item(s) await assessor review.",
        "evidence": [{ "id": "...", "title": "Isolation record", "review_status": "pending" }],
        "linked_tasks": [],
        "conflicts": [],
        "assessor_review_required": true
      }
    ],
    "recommendations": [
      {
        "task": { "code": "ELE-L2-PT-01", "rubric_reference": "ELE-L2-R01" },
        "addresses_criterion_codes": ["ELE-L2-C01", "ELE-L2-C02"],
        "reason": "Approved task targets unresolved criterion code(s): ELE-L2-C01, ELE-L2-C02"
      }
    ]
  }
}
```

## 7. Database changes

Migration `c7d2a9f4b6e1_assessment_engine_fields` (revises `a4f9c2e3b1d7`):

- `approved_assessment_tasks`
  - `criterion_codes` (JSON) — criterion codes the task verifies
  - `rubric_reference` (varchar 100)
  - `is_approved` (boolean, default false)
- `criterion_evidence_maps`
  - `mapping_source` (`manual` / `suggested` / `assessor`)
  - `match_score` (`numeric(4,3)`, nullable)
  - `match_explanation` (text, nullable)

Apply with:

```bash
cd backend
alembic upgrade head
python scripts/seed_catalogue.py
python scripts/seed.py        # upserts criterion links + rubric references on demo tasks
```

Existing task rows default to `is_approved = false`; re-seeding updates the
curated demo tasks to `true`.

## 8. Mobile

- `mobile/hooks/useAssessments.ts` — case list, workspace, open/submit, mapping
  suggestions, link creation/removal.
- `mobile/app/(worker)/assessment.tsx` — Assessment tab: qualification picker,
  criterion-level statuses, evidence review states, conflicts, suggestions with
  explicit "requires assessor review" labels, and approved task recommendations.
- `mobile/lib/apiClient.ts` — restored shared HTTP client (Bearer token from
  SecureStore, envelope unwrapping, error normalisation, uploads, timeouts).

## 9. Tests

`backend/tests/test_assessment_engine.py` (18 tests) covers:

- missing evidence → `GAP`, mandatory blockers, task traceability
- pending → `PENDING_REVIEW`
- rejected → `ADDITIONAL_EVIDENCE_REQUIRED`
- accepted + unpassed task → `PRACTICAL_VERIFICATION_REQUIRED`
- accepted + passed task → `READY_FOR_ASSESSOR_DECISION`, never `VERIFIED`
- optional gap does not block mandatory readiness
- conflicting evidence surfaced explicitly
- suggestions version-bound, valid IDs, ranking signal wording
- invalid criterion ID → 422
- criterion from another qualification → 422
- duplicate mapping idempotent and persisted
- low-similarity "suggested" link demoted to `manual`
- cross-worker evidence → 403
- case ownership, customer/worker queue restrictions
- submission → assessor queue, duplicate submission idempotent
- case reuse for the same qualification
- mass-assignment guard: workers cannot set formal status/assessor; only
  `draft → submitted` is self-service
- repeat evaluation determinism

Run:

```bash
cd backend
python -m pytest -q
```

Last verified result: **53 passed** (35 pre-existing + 18 engine tests), against
Python 3.14 / FastAPI 0.135 / SQLAlchemy 2.0.48 / in-memory SQLite.

The migration chain was also verified end-to-end on SQLite with Alembic 1.20:
`alembic upgrade head` applied `b1110b6c4588 → a4f9c2e3b1d7 → c7d2a9f4b6e1`,
the new columns were present, and `alembic downgrade base` completed cleanly.
This uncovered and fixed a missing `import app.db.types` in the pre-existing
initial migration, which previously made `alembic upgrade` fail. The chain has
not been executed against PostgreSQL in this environment.

Mobile verification:

- `npm run typecheck` → exit 0
- `npx expo export --platform android` → Android bundle exported successfully

## 10. Decisions and trade-offs

1. **Computed states, not a stored state table.** Criterion states are derived
   on every request, so they cannot drift from evidence, mappings, and results.
   Formal decisions (Part 6) will add persisted decision records, not overwrite
   the engine's inputs.
2. **No auto-verification.** Accepted evidence never marks a competency. A
   separate authorised decision is required, satisfying the "upload ≠ verified"
   rule.
3. **Task coverage via criterion codes.** Tasks link to criteria by code inside
   the qualification, which keeps version-bound traceability and avoids a
   many-to-many table that could drift across versions.
4. **Practical gating is task-based.** If an approved task references an
   accepted criterion and no passing result exists, the criterion needs
   practical verification. Criteria without a linked task can reach
   `READY_FOR_ASSESSOR_DECISION` on evidence alone.
5. **Suggestions are opt-in.** The workspace only calls the suggestion endpoint
   when the worker asks, so no misleading automated links appear by default.

## 11. Part 6 extension (implemented)

Part 6 now layers formal decisions on top of these deterministic states:

- evidence accept/reject with reviewer identity and audit logging;
- per-criterion decisions with a unique `(case, criterion)` constraint,
  version pinning, rubric result, and rationale;
- practical `AssessmentResult` recording with server-computed pass/fail;
- `CompetencyVerification` issuance only from an authorised final decision when
  every mandatory criterion is approved;
- audit-log entries for every formal transition;
- real assessor queue/review/history screens in the mobile app.

See [`assessor-workflow.md`](assessor-workflow.md). The engine still owns
criterion readiness; the assessor layer owns the formal decision. No Part 5
endpoint allows a worker, customer, or unauthenticated caller to change a formal
assessment state.
