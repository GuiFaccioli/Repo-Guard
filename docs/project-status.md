# RepoGuard Project Status

This document tracks implementation progress, current milestone focus, and the next delivery steps.

## Completed Milestones
- Repository standards and AI collaboration base:
  - `AGENTS.md`
  - specialized agent instruction files in `agents/`
- Frontend foundation (`frontend/`) with:
  - React + Vite + React Router
  - GitHub-first onboarding route at `/`
  - placeholder routes for `/auth/callback`, `/repositories`, and `/repositories/:id`
- Backend foundation (`backend/`) with:
  - NestJS app bootstrap
  - health endpoint (`GET /health`)
  - initial GitHub OAuth endpoints:
    - `GET /auth/github/start`
    - `GET /auth/github/callback`
    - `GET /auth/me`
    - `POST /auth/logout`
  - session-based auth groundwork and OAuth state validation
- Authenticated repository listing:
  - backend `GET /repositories` route using server-side GitHub token
  - safe repository response mapping (no token exposure)
  - frontend `/repositories` hydration with loading/empty/error states
  - real public repository rendering after successful authentication
- Frontend deployed to Vercel with monorepo settings using `frontend/` as root directory.

## Current Milestone
Authenticated repository listing and transition to repository health checks.

## Next Milestones
1. Implement MVP repository checks and scoring strategy.
2. Add Prisma + PostgreSQL persistence for scan history.
3. Add GA4 + Measurement Protocol tracking for key product events.
4. Add repository detail-driven scan execution flow.

## Not Implemented Yet
- Full repository scan engine execution.
- Persistent database models and migrations (Prisma/PostgreSQL).
- Real dashboard metrics sourced from stored scan history.
- Production-ready analytics instrumentation and event validation.
- Advanced security/quality/maintenance checks beyond MVP baseline.

## Development Progression (High Level)
1. Documentation and agent workflow structure.
2. Frontend foundation and deployment pipeline.
3. Backend OAuth foundation and local auth validation.
4. Documentation hardening for local developer experience.
5. Authenticated GitHub public repository listing in frontend dashboard.
