# Frontend deployment on Vercel

This guide covers deployment of the RepoGuard React + Vite frontend only.

## Production frontend URL
- https://repo-guard-beta.vercel.app/

## Prerequisites
- GitHub repository with `main` branch.
- Project imported into Vercel.
- Frontend located in `frontend/`.

## Step-by-step
1. Open https://vercel.com/new and select `GuiFaccioli/Repo-Guard`.
2. In project settings, set:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. In **Environment Variables**, configure when needed:
   - `VITE_API_URL`
   - `VITE_GA_MEASUREMENT_ID`
4. Click **Deploy**.

## Post-deploy validation
1. Open the generated URL and verify that the GitHub-first onboarding screen loads at `/`.
2. Navigate through placeholder routes:
   - `/auth/callback`
   - `/repositories`
   - `/repositories/1`
3. Confirm there are no 404 errors on application routes.

## Notes
- This stage does not include real OAuth.
- This stage does not include production backend integration.
- GitHub profile/avatar shown in the UI is conceptual until backend OAuth is implemented.
- Environment values must be configured in the Vercel dashboard, never in a versioned `.env`.
