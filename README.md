# RepoGuard

RepoGuard is an international portfolio project focused on basic GitHub repository analysis across three core pillars: security, quality, and maintenance.

## Current status
- Agent instruction base is in place (`AGENTS.md` and `agents/`).
- Frontend foundation is in place with React + Vite + React Router in `frontend/`.
- Backend foundation is now in place with NestJS in `backend/`.
- GitHub-first flow is wired as:
  - frontend `/` -> backend `/auth/github/start` (when `VITE_API_URL` is set)
  - backend redirects to GitHub authorization
  - GitHub callback returns to backend `/auth/github/callback`
  - backend validates state, creates session, and redirects to frontend `/repositories`
- Placeholder frontend routes remain:
  - `/`
  - `/auth/callback`
  - `/repositories`
  - `/repositories/:id`
- Repository scanning, Prisma, and PostgreSQL are not implemented yet.

## Run frontend locally
1. Enter the frontend directory:
   - `cd frontend`
2. Install dependencies:
   - `npm install`
3. Start development server:
   - `npm run dev`
4. Build for production:
   - `npm run build`

## Run backend locally
1. Enter the backend directory:
   - `cd backend`
2. Install dependencies:
   - `npm install`
3. Create local env file from example:
   - copy `backend/.env.example` to `backend/.env`
4. Start development server:
   - `npm run start:dev`

Backend default URL:
- `http://localhost:3001`

## Local port conflict (EADDRINUSE on 3001)
If NestJS fails with `Error: listen EADDRINUSE: address already in use :::3001`, another process is already using port `3001`.

Windows commands:
- Find the process using port `3001`:
  - `netstat -ano | findstr :3001`
- Kill by PID:
  - `taskkill /PID <PID> /F`

Alternative options:
- Stop the other terminal/process with `Ctrl + C`.
- Temporarily change `PORT` in `backend/.env` and update `GITHUB_CALLBACK_URL` to the same port.
- Update the GitHub OAuth App callback URL in Developer Settings to match the backend callback URL exactly.

Required backend routes:
- `GET /health`
- `GET /auth/github/start`
- `GET /auth/github/callback`
- `GET /auth/me`
- `POST /auth/logout`

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

For local OAuth testing, set:
- `VITE_API_URL=http://localhost:3001`

## OAuth security notes
- GitHub client secret stays on backend only.
- GitHub access token is never returned to the frontend.
- Session cookie is `httpOnly`.
- OAuth state is validated to protect against CSRF.
- Do not commit real `.env` files.

## Next steps
1. Persist authenticated users and OAuth metadata with Prisma/PostgreSQL.
2. Implement repository fetch and dashboard data from GitHub API.
3. Add scan execution and result persistence.
4. Add GA4/Measurement Protocol events after auth and scan actions.
