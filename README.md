# RepoGuard

RepoGuard is an international portfolio project focused on basic GitHub repository analysis across three core pillars: security, quality, and maintenance.

## Current status
- Agent instruction base is in place (`AGENTS.md` and `agents/`).
- Initial frontend foundation is in place with React + Vite + React Router in `frontend/`.
- The current deployed experience is GitHub-first onboarding:
  - `/` focuses on "Continue with GitHub" entry
  - `/auth/callback` is a clear OAuth placeholder
  - `/repositories` is the future post-login dashboard foundation
  - `/repositories/:id` is the future repository drill-down page
- Placeholder routes are available for:
  - `/`
  - `/auth/callback`
  - `/repositories`
  - `/repositories/:id`
- Real OAuth, backend, GitHub API integration, and database features are not implemented yet.

## Run frontend locally
1. Enter the frontend directory:
   - `cd frontend`
2. Install dependencies:
   - `npm install`
3. Start development server:
   - `npm run dev`
4. Build for production:
   - `npm run build`

## Quick Vercel deployment
When importing this repository into Vercel:
- Root Directory: `frontend`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

Production frontend URL:
- https://repo-guard-beta.vercel.app/

Expected frontend environment variables:
- `VITE_API_URL`
- `VITE_GA_MEASUREMENT_ID`

Template file:
- `frontend/.env.example`

## Next steps
1. Implement backend-backed GitHub OAuth with NestJS.
2. Fetch authenticated GitHub profile (avatar/name) after connection.
3. Integrate repository analysis data in the dashboard and detail pages.
4. Persist scan history in PostgreSQL with Prisma.
