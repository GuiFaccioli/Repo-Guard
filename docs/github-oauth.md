# GitHub OAuth Setup (RepoGuard MVP)

This document explains how to configure the GitHub OAuth App required by the current RepoGuard backend foundation.

## 1) Create a GitHub OAuth App
1. Open GitHub Developer Settings:
   - https://github.com/settings/developers
2. Go to **OAuth Apps**.
3. Click **New OAuth App**.
4. Fill in:
   - **Application name**: `RepoGuard` (or your preferred name)
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:3001/auth/github/callback`
5. Create the app and copy:
   - Client ID
   - Client Secret

## 2) Required local callback URL
For local development, callback must be:
- `http://localhost:3001/auth/github/callback`

The backend route `/auth/github/callback` handles:
- OAuth state validation;
- code exchange for access token;
- GitHub profile fetch;
- app session creation;
- redirect to frontend `/repositories`.

## 3) Environment variables
Create `backend/.env` using `backend/.env.example`:

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback
SESSION_SECRET=
```

Frontend (`frontend/.env`):

```env
VITE_API_URL=http://localhost:3001
VITE_GA_MEASUREMENT_ID=
```

## 4) MVP OAuth scopes
Current backend requests these scopes:
- `read:user`
- `user:email`
- `public_repo`

## 5) Security notes
1. Never expose `GITHUB_CLIENT_SECRET` to frontend code.
2. Never return the GitHub access token in frontend responses.
3. Do not log access tokens or secrets.
4. Keep `.env` files out of version control.
5. Use `httpOnly` session cookies.
6. In production, use secure cookies (`secure: true`) and HTTPS.
7. Restrict CORS origin to `FRONTEND_URL`.
