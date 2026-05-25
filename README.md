# RepoGuard

RepoGuard is an international portfolio project focused on basic GitHub repository analysis across three core pillars: security, quality, and maintenance.

## Current status
- Agent instruction base is in place (`AGENTS.md` and `agents/`).
- Initial frontend foundation is in place with React + Vite + React Router in `frontend/`.
- Placeholder routes are ready for:
  - `/`
  - `/auth/callback`
  - `/repositories`
  - `/repositories/:id`
- Real OAuth, backend, and database features are not implemented yet.

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
- Build Command: `npm run build`
- Output Directory: `dist`

Expected frontend environment variables:
- `VITE_API_URL`
- `VITE_GA_MEASUREMENT_ID`

Template file:
- `frontend/.env.example`

## Next steps
- Implement NestJS backend with GitHub OAuth.
- Integrate frontend with real API endpoints for repository listing and scan execution.
- Persist scan history in PostgreSQL with Prisma.
