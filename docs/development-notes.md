# RepoGuard Development Notes

This document contains internal setup guidance and troubleshooting notes for local development.

## Local Architecture
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- OAuth callback (local): `http://localhost:3001/auth/github/callback`

## Required Environment Files
Create local files from examples:
- `backend/.env` from `backend/.env.example`
- `frontend/.env` from `frontend/.env.example`

Required backend variables:
- `PORT=3001`
- `FRONTEND_URL=http://localhost:5173`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback`
- `SESSION_SECRET`

Required frontend variables:
- `VITE_API_URL=http://localhost:3001`
- `VITE_GA_MEASUREMENT_ID` (optional for now)

`VITE_API_URL` must be an absolute backend URL (`http://` or `https://`).
Relative values, empty values, or placeholder values are treated as invalid by the frontend OAuth entry flow.

Security warning:
- Never commit `.env` files.
- Never commit tokens, secrets, private keys, or real credentials.

## Frontend Local Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`
4. Optional validation: `npm run build`

## Backend Local Setup
1. `cd backend`
2. `npm install`
3. Configure `backend/.env`
4. `npm run start:dev`
5. Optional validation: `npm run build`

## Port 3001 Conflict Handling (Windows)
If backend startup fails with `EADDRINUSE`, port `3001` is already in use.

Find process using port `3001`:

```powershell
netstat -ano | findstr :3001
```

Kill by PID:

```powershell
taskkill /PID <PID> /F
```

Alternative options:
- Stop the process in the original terminal with `Ctrl + C`.
- Temporarily change `PORT` in `backend/.env`.

If you change the backend port locally, update all matching values:
1. `PORT` in `backend/.env`
2. `GITHUB_CALLBACK_URL` in `backend/.env`
3. `VITE_API_URL` in `frontend/.env`
4. GitHub OAuth App callback URL in GitHub Developer Settings

Important: GitHub OAuth callback URL must match the backend callback URL exactly.

## Vercel Deployment Settings (Frontend)
When importing into Vercel:
- Root Directory: `frontend`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

Required production environment variable:
- `VITE_API_URL=https://<your-backend-domain>`

Important:
- The frontend deployment alone cannot complete GitHub OAuth.
- `VITE_API_URL` in Vercel must point to the deployed backend domain that serves `/auth/github/start`.
- Do not use relative values such as `/x1x2x3x4` or placeholder values.

Production URL:
- https://repo-guard-beta.vercel.app/

## Related Docs
- OAuth setup and security notes: [github-oauth.md](github-oauth.md)
- Frontend deployment details: [deploy-vercel.md](deploy-vercel.md)
