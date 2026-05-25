# RepoGuard Backend

NestJS backend foundation for GitHub OAuth and session handling.

## Run locally
1. Install dependencies:
   - `npm install`
2. Create local environment file:
   - copy `.env.example` to `.env`
3. Start in development mode:
   - `npm run start:dev`

Default local URL:
- `http://localhost:3001`

## Port 3001 already in use (Windows)
If `npm run start:dev` fails with `EADDRINUSE`, port `3001` is busy.

1. Find the process:
   - `netstat -ano | findstr :3001`
2. Stop it by PID:
   - `taskkill /PID <PID> /F`

Alternative:
- Stop the process from the original terminal with `Ctrl + C`.
- Or temporarily change `PORT` in `.env`.

If you change `PORT`, also update `GITHUB_CALLBACK_URL` to the same backend port and make the GitHub OAuth App callback match exactly.

## Implemented routes
- `GET /health`
- `GET /auth/github/start`
- `GET /auth/github/callback`
- `GET /auth/me`
- `POST /auth/logout`

## Security notes
- Keep GitHub client credentials on backend only.
- Do not commit real `.env` files.
- Session cookie is `httpOnly`.
