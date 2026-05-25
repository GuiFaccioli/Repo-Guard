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
- First live repository health scan:
  - backend `POST /repositories/:id/scans` route
  - weighted checks for security, quality, and maintenance signals
  - score calculation (0-100), severity summary, and recommendations
  - frontend "Run scan" action with loading/error/result states per repository
- Scan mode selection implemented:
  - `green` scan for basic repository hygiene
  - `yellow` scan for maintainability and project quality signals
  - `red` scan for defensive security pattern detection
  - red scan reports potential risks only (no exploitation behavior)
- Frontend deployed to Vercel with monorepo settings using `frontend/` as root directory.

## Current Milestone
Green/Yellow/Red scan execution and preparation for scan history persistence.

## Next Milestones
1. Add Prisma + PostgreSQL persistence for scan history.
2. Add GA4 + Measurement Protocol tracking for key product events.
3. Add repository detail-driven scan execution flow.
4. Expand scan rule coverage and threshold tuning.

## Not Implemented Yet
- Persistent database models and migrations (Prisma/PostgreSQL).
- Scan history persistence and historical trend views.
- Production-ready analytics instrumentation and event validation.
- Advanced security/quality/maintenance checks beyond current baseline.

## Development Progression (High Level)
1. Documentation and agent workflow structure.
2. Frontend foundation and deployment pipeline.
3. Backend OAuth foundation and local auth validation.
4. Documentation hardening for local developer experience.
5. Authenticated GitHub public repository listing in frontend dashboard.
6. First live repository scan with score, checks, and recommendations.
7. Multi-mode Green/Yellow/Red scan workflow with defensive red pattern detection.
