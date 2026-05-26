# RepoGuard

RepoGuard is a full-stack project for repository health and defensive security review.

Today, RepoGuard already supports authenticated GitHub repository selection, automated repository scanning, safe evidence generation, and deterministic AI-review-shaped guidance.

## Live Demo
- https://repo-guard-beta.vercel.app/

## How RepoGuard Works Today

### 1. Authentication and Session
- User starts GitHub OAuth via backend.
- Backend stores GitHub access token server-side in session.
- Frontend validates session with `/auth/me`.

### 2. Repository Selection Flow
- Frontend loads authenticated public repositories from backend (`GET /repositories`).
- User selects one repository at `/repositories`.
- Repository detail route (`/repositories/:id`) automatically triggers a Green Scan.

### 3. Scan and Report Flow
RepoGuard currently has two scan entry points:

- OAuth repository scan (GitHub only): `POST /repositories/:id/scans`
  - Supports `green`, `yellow`, and `red` scan types.
  - Returns score, checks, summary, and recommendations.

- URL-based scan service: `POST /scans`
  - Supports GitHub, GitLab, and Bitbucket repository URLs.
  - Supports checklist-based scan output (`good_practices`, `security_basics`).
  - Returns deterministic results plus:
    - `evidencePacket` (safe evidence contract)
    - `aiReview` (deterministic AI-review-shaped report, no provider call)

### 4. Safe Evidence and AI Review (Current Backend State)
- Safe Evidence Packet is implemented.
- Secret-like values are masked in safe excerpts.
- AI Review service abstraction is implemented and deterministic.
- No real AI provider call is used.
- No MCP integration is implemented yet.

## Checks Available Today

Green/Good Practices baseline includes items such as:
- README
- `.gitignore`
- `package.json`
- Dependabot
- CI automation
- LICENSE
- Recent activity
- Open issues / open pull requests

Code safety checks include items such as:
- hardcoded secret patterns
- committed `.env` files
- SQL string concatenation patterns
- eval/new Function usage
- permissive CORS patterns

## Tech Stack
Frontend:
- React
- Vite
- React Router

Backend:
- Node.js
- NestJS

Database direction:
- PostgreSQL
- Prisma

Integrations:
- GitHub OAuth
- GitHub REST API
- GA4 direction (event instrumentation still evolving)

## Current Scope and Limitations
- Repository persistence/history is not implemented yet.
- AI review is deterministic placeholder logic only (no model/provider yet).
- MCP layer is not implemented yet.
- Product and architecture are evolving in incremental phases.

## Project Status and Roadmap
- Progress and milestones: [docs/project-status.md](docs/project-status.md)
- AI review architecture and phase status: [docs/ai-review/AI_REVIEW_ARCHITECTURE.md](docs/ai-review/AI_REVIEW_ARCHITECTURE.md)

## Local Development
- Setup, environment variables, OAuth local notes, and troubleshooting: [docs/development-notes.md](docs/development-notes.md)

## AI-Assisted Development
This repository uses [AGENTS.md](AGENTS.md) and specialized instructions under [`agents/`](agents/) to keep AI-assisted work consistent and safe.
