# RepoGuard

RepoGuard is a full-stack app for repository health and defensive security diagnostics.

## Current Product State (as implemented)

RepoGuard currently has **two scan flows**:

1. **Authenticated repository scan (GitHub OAuth)**
   - User authenticates with GitHub.
   - User selects one public repository at `/repositories`.
   - `/repositories/:id` runs a **single `general` scan** automatically.
   - Output is didactic per check (`green` / `yellow` / `red`) with context, confidence, uncertainty notes, and sources.

2. **URL-based scan (no OAuth session)**
   - User can submit a repository URL on `/`.
   - Backend endpoint `POST /scans` supports GitHub/GitLab/Bitbucket URL parsing.
   - Returns deterministic checklist results plus safe evidence packet and deterministic AI-review-shaped guidance.

## Key Backend Behavior

- `GET /repositories` lists authenticated **public** GitHub repositories.
- `POST /repositories/:id/scans` now runs one scan type only: `general`.
- Global numeric score was removed from repository scan response.
- Repository scan response includes:
  - `summary` (`green`, `yellow`, `red`, `highestSeverity`)
  - `context`
  - `checks`
  - `didacticChecks`
  - `recommendations`

## Tech Stack

- Frontend: React + Vite + React Router
- Backend: NestJS (Node.js)
- Auth: GitHub OAuth + server-side session
- Integrations: GitHub REST API
- Analytics: GA4 frontend instrumentation
- Data direction: PostgreSQL + Prisma (not yet implemented for scan persistence)

## Security Model

- GitHub token stays server-side in session.
- Session cookie is `httpOnly`.
- Safe evidence masks sensitive literals.
- Analytics helper allowlists event names/params and blocks sensitive payloads.

## Local Development

- Setup and env notes: `docs/development-notes.md`
- OAuth setup: `docs/github-oauth.md`
- Status and milestones: `docs/project-status.md`
- GA4 events: `docs/analytics/GA4_EVENTS.md`

## AI-assisted Development

Project workflow and guardrails are defined in `AGENTS.md`.
