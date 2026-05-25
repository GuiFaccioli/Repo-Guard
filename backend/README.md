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
