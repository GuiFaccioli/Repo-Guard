# RepoGuard Project Status

## Snapshot (current)

RepoGuard is running with:
- GitHub OAuth session flow
- authenticated public repository listing
- single-scan repository diagnosis (`general`) on `/repositories/:id`
- didactic per-check output (`green`/`yellow`/`red`) with context and sources
- URL-based scanner (`POST /scans`) with deterministic evidence + AI-review-shaped summary

## Delivered

### Auth and session
- `GET /auth/github/start`
- `GET /auth/github/callback`
- `GET /auth/me`
- `POST /auth/logout`

### Repository flow (OAuth)
- `GET /repositories` (public repositories only)
- `POST /repositories/:id/scans` (single `general` scan)
- Frontend selector at `/repositories`
- Auto-run scan report at `/repositories/:id`
- Guide page at `/repositories/:id/checks/:checkId`

### Scanner redesign (completed and archived)
- Removed global score from repository scan output
- Removed mode selection in repository route API/UX
- Added contextual didactic checks:
  - status: green/yellow/red
  - explanation fields
  - confidence + uncertainty
  - sources per argument
- SDD change archived at:
  - `openspec/changes/archive/2026-05-27-scanner-evaluation-redesign`
- Canonical spec synced to:
  - `openspec/specs/scanner-evaluation/spec.md`

## In-place technical constraints

- OAuth repository scan still blocks private repositories.
- Lint has known pre-existing debt in some files (outside the scanner redesign scope).
- URL scan and OAuth scan coexist with different response contracts.

## Next recommended milestones

1. Normalize contracts between URL scan and OAuth repository scan where useful.
2. Expand contextual inference quality and reduce false positives/negatives.
3. Add automated measurement for preferred source-density target (2+ sources when applicable).
4. Resolve repo-wide lint debt in a dedicated change.
5. Revisit private repository support as a separate scoped change.
