# Rollout and Rollback — scanner-evaluation-redesign

## Rollout plan

### R0 — Local verification (current)
- Backend contract validated with `didacticChecks` as primary didactic output.
- Frontend report consumes `didacticChecks` and renders Green/Yellow/Red with didactic fields, confidence, uncertainty, and sources.

### R1 — Controlled release
- Deploy with monitoring of scan failures and payload shape consistency.
- Track regressions in:
  - missing `didacticChecks`
  - empty `sources`
  - unknown status values outside `green|yellow|red`

### R2 — Default behavior confirmation
- Keep single-scan behavior as default.
- Confirm no UI surface shows global score or scan mode selector.

## Rollback triggers
- Backend responses without `didacticChecks` for authenticated scans.
- Frontend runtime error in repository report page.
- Unexpected increase of scan request failures after deployment.

## Rollback actions
1. Revert to previous stable commit.
2. Re-run:
   - `cd backend && npm test`
   - `cd backend && npm run build`
   - `cd frontend && npm run build`
3. Validate repository report route manually after rollback.

## Safety constraints
- No exposure of tokens/secrets in logs, UI, or analytics.
- Educational and non-alarmist wording maintained in report copy.
