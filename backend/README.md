# RepoGuard Backend

NestJS backend for OAuth, repository listing, and scanning.

## Run locally

1. `npm install`
2. Configure `.env` from `.env.example`
3. `npm run start:dev`

Default local URL: `http://localhost:3001`

## Implemented routes

- `GET /health`
- `GET /auth/github/start`
- `GET /auth/github/callback`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /repositories`
- `POST /repositories/:id/scans` (single `general` scan)
- `POST /scans` (URL-based deterministic scan service)

## Repository scan contract (OAuth route)

`POST /repositories/:id/scans` returns:
- `scanType: "general"`
- `summary` with `green/yellow/red` counts + `highestSeverity`
- `context` profile
- raw `checks`
- didactic `didacticChecks`
- `recommendations`

## Security notes

- GitHub tokens remain server-side in session.
- Session cookie is `httpOnly`.
- Private repositories are currently blocked in OAuth repository scan flow.
- Never commit `.env` or credentials.
