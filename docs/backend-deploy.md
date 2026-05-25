# RepoGuard Backend Deployment (NestJS)

This guide prepares the RepoGuard backend for deployment on Node platforms such as Render, Railway, or Koyeb.

## 1) Recommended Provider Options

- **Render**: simple Node web service setup and stable environment variable management.
- **Railway**: fast setup with built-in service networking.
- **Koyeb**: good global deployment options with standard Node runtime support.

Any provider is acceptable if it supports:
- Node.js runtime;
- custom environment variables;
- HTTPS public URL;
- persistent process for session-based auth flow.

## 2) Required Environment Variables

Set these variables on the backend hosting provider:

- `NODE_ENV=production`
- `PORT` (provider usually injects this automatically)
- `FRONTEND_URL=https://repo-guard-beta.vercel.app`
- `GITHUB_CLIENT_ID=<your_github_oauth_client_id>`
- `GITHUB_CLIENT_SECRET=<your_github_oauth_client_secret>`
- `GITHUB_CALLBACK_URL=https://<your-backend-domain>/auth/github/callback`
- `SESSION_SECRET=<long-random-secret-at-least-16-chars>`

Notes:
- `FRONTEND_URL` can be a comma-separated list when explicitly needed (for example production + preview), but do not use wildcard origins.
- Do not include quotes around values unless your provider requires them.

## 3) Build and Start Commands

Backend scripts already support production deployment:

- Development: `npm run start:dev`
- Build: `npm run build`
- Production start: `npm run start:prod`

Typical provider setup:
- **Build command**: `npm install && npm run build`
- **Start command**: `npm run start:prod`

## 4) GitHub OAuth Production Callback

After backend deployment, update your GitHub OAuth App:

1. Open GitHub Developer Settings -> OAuth Apps -> RepoGuard app.
2. Set **Authorization callback URL** to:
   - `https://<your-backend-domain>/auth/github/callback`
3. Save changes.

Important:
- Callback URL must match `GITHUB_CALLBACK_URL` exactly.

## 5) Vercel Frontend Configuration

In Vercel project settings for the frontend (`frontend/`), configure:

- `VITE_API_URL=https://<your-backend-domain>`

Without this value, frontend OAuth start will remain disabled by safety checks.

## 6) Production Health Check

After deployment, test:

- `GET https://<your-backend-domain>/health`

Expected response:

```json
{
  "status": "ok"
}
```

## 7) Production OAuth Flow Test

1. Open `https://repo-guard-beta.vercel.app`.
2. Click **Continue with GitHub**.
3. Confirm redirect to GitHub authorization screen.
4. Authorize RepoGuard.
5. Confirm redirect back to frontend `/repositories`.
6. Confirm frontend can load:
   - `GET /auth/me` through backend;
   - `GET /repositories` through backend.

## 8) Security Warnings

- Never commit `.env` files.
- Never log or expose:
  - `GITHUB_CLIENT_SECRET`
  - session secrets
  - GitHub access tokens
  - `Authorization` headers
- Keep CORS explicit via `FRONTEND_URL` (no `*`).
- Use HTTPS in production so `secure` cookies + `SameSite=None` work correctly for frontend/backend on different domains.
