# CraftRelay integration and reliability pass

## Changes

- Evidence submissions now validate criterion IDs before writing database links.
- Evidence detail and download access is limited to the owning worker, assessors, and admins.
- Evidence draft retries send a persistent idempotency key. The API stores that key and returns the original evidence record on a retry, including after an app restart.
- Interrupted SQLite syncs recover as failed drafts. Network failures are retried every 20 seconds while the evidence screen is open; validation, authorization, and server conflicts remain visible for user action.
- HTTP 409 is shown as a conflict. HTTP 422 remains a correctable submission failure.
- The assessment screen derives its initial selected case from saved backend cases without a state-setting effect.

## Verification

- Backend: `python -m pytest -q` — 85 passed, including the saved-record end-to-end workflow and new evidence security/idempotency tests.
- Mobile: `npm run typecheck` — passed.
- Mobile: `npm run lint` — passed with 0 errors and 19 unused-variable/import warnings after formatting cleanup.
- Backend Python sources compile, and Alembic reports `e5b7c4a2d913` as the single migration head.
- `npm audit` reported 28 advisories (18 high, 10 moderate). The proposed automatic fix would require a major Expo downgrade to SDK 44, so no compatibility-breaking dependency change was applied. Review/upgrade the Expo and React Native dependency tree in an SDK-aligned security update.
- The backend API test client uses a fresh SQLite schema per test; it does not constitute a physical Android device test.

## Remaining limitations

- Offline support covers evidence draft capture and queued synchronization only. Assessments, recommendations, bookings, request transitions, and reviews still require a live API connection.
- Automatic retries run while the evidence screen is mounted. A draft that receives a validation error or a server conflict requires the worker to correct the issue and create a fresh draft; conflict drafts can be removed but not edited in place.
- Evidence submission is create-only, so the current workflow has no mutable server record version to compare. HTTP 409 responses are surfaced as conflicts, but editing drafts against concurrent server-side changes is not supported yet.
- The web fallback stores drafts in memory for the current session; persistent SQLite drafts are supported on native devices. Native SQLite initialization failures now report a save/load error instead of claiming a volatile draft was persisted.
- Native file URIs are retained in SQLite. Platform file cleanup/retention behavior can still make a draft attachment unavailable if the operating system removes its temporary file before sync.
- No automated mobile UI or Android device test harness is configured in the repository. The full workflow has backend integration coverage, but has not been exercised on a physical Android device in this environment.
- Evidence storage is local filesystem storage by default. Production deployments need a durable private object store and appropriate backup/retention policies.
- The new evidence idempotency migration has been added but was not applied to a live database in this environment. Deployments must apply Alembic migrations before enabling client idempotency keys.
