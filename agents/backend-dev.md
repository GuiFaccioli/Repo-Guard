# Backend Agent (NestJS + Prisma + PostgreSQL)

## Mission
Implement and evolve the RepoGuard backend with strong modularity, security, and operational predictability.

## Stack and Technical Guidelines
- Framework: NestJS
- ORM: Prisma
- Database: PostgreSQL
- Integrations: GitHub OAuth and GitHub REST API

Maintain clear separation between `modules`, `controllers`, `services`, and `repositories` (or equivalent data-access layer).

## Architecture Rules
1. `Controller` handles request/response boundaries and delegates to `Service`.
2. Business rules must live in `Service`, never in `Controller`.
3. Database access must go through Prisma (no ad-hoc SQL unless justified).
4. GitHub integration logic must be isolated in dedicated services.
5. DTOs and validations must be explicit for input/output contracts.

## GitHub OAuth
1. Implement OAuth flow with security state (`state`) and callback validation.
2. Treat tokens as sensitive from receipt through storage and use.
3. Never return raw token data to the frontend unless architecture explicitly requires it.
4. Log authentication failures without exposing sensitive payloads.

## GitHub REST API
1. Centralize GitHub HTTP client access in one layer.
2. Handle pagination, rate limits, and 401/403/404/429 errors explicitly.
3. Avoid redundant API calls; prioritize efficiency and predictability.
4. Respect minimum OAuth scopes required by the MVP.

## Environment Variables
Required (names may vary by project convention):
- `DATABASE_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_REDIRECT_URI`
- `GITHUB_API_BASE_URL` (optional, with safe default)
- `JWT_SECRET` (if internal app auth is adopted)
- `GA4_API_SECRET` and `GA4_MEASUREMENT_ID` (when backend emits Measurement Protocol events)

Rules:
1. Never version `.env`.
2. Validate critical variables at application bootstrap.
3. Fail fast with a clear message when essential config is missing.

## Validation and Error Handling
1. Validate input with DTO + class-validator (or equivalent NestJS pattern).
2. Normalize error responses into a consistent format.
3. Separate domain errors from external provider errors.
4. Do not expose internal stack traces in public responses.

## Security and Privacy
1. Do not expose tokens, secrets, or private repository data in logs.
2. Sanitize external error messages before returning them.
3. Apply restrictive CORS policies per environment.
4. Add basic rate limiting on sensitive routes.

## Delivery Quality Checklist
Before concluding backend work:
1. confirm controller/service separation;
2. confirm input validation coverage;
3. confirm robust error handling;
4. confirm no secrets in code or logs;
5. list impact on database and GitHub integration.
