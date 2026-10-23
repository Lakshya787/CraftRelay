# CraftRelay SIH judging demo

## Seed and account setup

Use a fresh demo database or a disposable staging database, apply migrations, then run both idempotent seed scripts. Do not seed production.

```powershell
cd backend
python -m alembic upgrade head
$env:CRAFTRELAY_DEMO_PASSWORD = "<temporary strong password, at least 12 characters>"
python scripts/seed.py
python scripts/seed_demo_scenarios.py
```

The seed creates fictional worker, assessor, customer, and admin accounts at `@craftrelay.dev`. The password is supplied at runtime; no shared demo password is stored in the repository. `seed_demo_scenarios.py` adds a pending electrical case with mapped evidence and unresolved criteria, a negative plumbing case with rejected evidence, an actionable service request, and a completed request with a review. The scripts are safe to rerun. They do not create an uploaded evidence binary; seeded evidence is illustrative metadata. Use the live upload flow to demonstrate a real file upload.

All seeded qualifications, criteria, rubrics, evidence, and customer activity are fictional illustrations, not official NCVT or government standards. Do not present them as authoritative source material.

## Judging flow

1. Sign in as the seeded worker. Show the declared skills and profile.
2. Open the Electrical Wiring — Level 2 assessment case. Show the saved evidence record and its links to criteria 1 and 2.
3. Show the unresolved criteria as evidence gaps. Explain that text matching ranks suggestions and is not a competence probability.
4. Open the approved practical task recommendation and show its rubric and criterion references.
5. Sign in as the assessor. Review the submitted evidence and criterion links, then record the practical result and criterion decisions through the normal assessor workflow.
6. Return to the worker profile and show the competency verification after an authorized final decision. The seeded records are not pre-approved; use the workflow to produce a verified record.
7. Sign in as the customer and browse workers. Explain that declared skills and customer feedback are separate from formal verification.
8. Create a service request for the worker, then switch to the worker account to accept it, start work, and submit completion.
9. Switch back to the customer account to confirm completion and submit a review.
10. Explain the three signals: a worker declaration is self-reported, formal verification is an assessor decision against criteria, and a review is customer feedback about a completed service.

## Fallback

If AI assistance or connectivity fails, use the deterministic criterion mapping/task recommender and the seeded pending/rejected evidence records. Draft capture is limited to evidence drafts on the device; it does not make assessment, discovery, requests, or the whole application available offline. The seeded scenarios can be used when backend access is available. Do not claim a complete offline demo.

## Android demo APK

The `mobile/eas.json` `demo` profile produces an internally distributed APK. From `mobile/`, authenticate the EAS CLI, link the project once with `npx eas-cli@latest init`, and set `EXPO_PUBLIC_API_BASE_URL` in the EAS `preview` environment to the deployed HTTPS API root including `/api/v1`:

```powershell
npx eas-cli@latest env:set --name EXPO_PUBLIC_API_BASE_URL --value https://<deployed-host>/api/v1 --environment preview --visibility plaintext
npx eas-cli@latest build --platform android --profile demo
```

The API base URL is public application configuration, not a secret. Do not add backend keys, database credentials, signing passwords, or AI provider secrets to `EXPO_PUBLIC_*` variables. The release API client rejects missing configuration and non-HTTPS base URLs. EAS will prompt to create/manage Android signing credentials on the first build; retain the generated keystore in the EAS project and follow your organization’s signing policy.

Local `.env` files are excluded by `mobile/.gitignore` and must not be uploaded. Configure the API URL in the EAS `preview` environment used by this profile.

Install the returned APK on a physical Android device and verify login, worker evidence, assessor review/approval, customer request lifecycle, completion, and review against the deployed backend before presenting. This repository does not contain the deployed host, EAS project ID, device, or credentials, so a real cloud build and physical-device verification remain environment-dependent.

## Known limitations

- Seeded evidence records are metadata only; they do not include binary files.
- A full AI-assisted workflow is not guaranteed; deterministic recommendations are the fallback.
- Offline support is limited to local evidence draft capture and queued synchronization. Other screens require network access.
- Admin overview, users, audit logs, admin assessment summaries, and the legacy customer account/worker-detail screens still use fictional local sample data. They now carry an explicit sample-data notice; use the backend-connected worker, assessor, discovery, and request flows for the judging workflow.
- Mobile lint reports 19 unused-variable/import warnings. The dependency audit reported 28 advisories (18 high, 10 moderate); an automatic fix would downgrade Expo across major SDK versions, so a coordinated SDK upgrade is still needed.
- The available environment has no confirmed deployed endpoint or physical Android device; APK installation and deployed-backend workflow checks remain to be completed by the demo owner.

## Verification status for this preparation pass

- Backend: `python -m pytest -q` — **85 passed**. On this Windows environment, the runner remained alive after printing the complete passing summary and was interrupted.
- Backend syntax and migration metadata: `python -m compileall -q app scripts` and `python -m alembic heads` — passed; head is `e5b7c4a2d913`.
- Seed scripts compile; they were not executed because this workspace has no disposable demo database configured.
- Mobile: `npm run typecheck` — passed.
- Mobile: `npm run lint` — completed with 0 errors and 19 existing unused-variable/import warnings.
- Mobile tests: no test script or mobile test suite is configured in `mobile/package.json`.
- Expo Doctor: attempted, but produced no output and did not complete within 60 seconds in this environment.
- EAS cloud build, physical-device install, and deployed-backend workflow: not run because the deployed API URL, linked EAS project, and physical device were not available in this workspace.
