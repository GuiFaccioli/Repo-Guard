# RepoGuard Frontend

This directory contains the React + Vite frontend for RepoGuard.

## Scope of this stage
- GitHub-first onboarding and routing/page placeholders.
- No real repository analysis yet.
- OAuth is backend-driven and still in foundation stage.

## Available routes
- `/` (GitHub-first onboarding entry)
- `/auth/callback`
- `/repositories`
- `/repositories/:id`

## Local development
1. Install dependencies:
   - `npm install`
2. Start dev server:
   - `npm run dev`
3. Build production bundle:
   - `npm run build`

## Environment variables
Use `frontend/.env.example` as reference:
- `VITE_API_URL` (local default: `http://localhost:3001`)
- `VITE_GA_MEASUREMENT_ID`

If backend port changes locally, update `VITE_API_URL` to the same backend URL.
