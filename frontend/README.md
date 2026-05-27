# RepoGuard Frontend

React + Vite frontend for RepoGuard.

## Current routes

- `/` — landing with URL-based scan flow and onboarding entry
- `/auth/callback` — OAuth callback handling
- `/repositories` — authenticated repository selector
- `/repositories/:id` — automatic `general` scan report
- `/repositories/:id/checks/:checkId` — didactic check guide/details

## Current report behavior (`/repositories/:id`)

- Scan starts automatically after repository resolution.
- UI prioritizes `didacticChecks` from backend.
- Per-check output includes:
  - green/yellow/red status
  - what was checked
  - why it matters
  - what was found
  - suggested action
  - confidence / uncertainty
  - sources
- No global score rendering.

## Local development

1. `npm install`
2. `npm run dev`
3. `npm run build`

## Environment

- `VITE_API_URL` (required)
- `VITE_GA_MEASUREMENT_ID` (optional)

If backend URL/port changes, update `VITE_API_URL` accordingly.
