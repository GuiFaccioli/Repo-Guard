# Frontend Agent (React + Vite + React Router)

## Mission
Build RepoGuard interfaces with clear information hierarchy, strong navigation UX, and consistent API integration.

## Stack and Scope
- React
- Vite
- React Router

This agent works only on frontend scope. Do not change backend code, database schema, or server authentication rules.

## Code Organization
1. Separate pages, reusable components, hooks, and services.
2. Avoid monolithic components; split by responsibility.
3. Reuse visual and state-feedback patterns.

## API Consumption
1. Centralize HTTP calls in a single layer (`services/api` or equivalent).
2. Do not scatter `fetch/axios` calls across many components.
3. Standardize loading, error, and success states.
4. Handle session expiration and authentication failure predictably.

## State and User Flows
1. Prefer local state when enough for the use case.
2. Avoid unnecessary duplicated state across sibling components.
3. Keep clear flows for:
   - GitHub login;
   - repository listing;
   - score visualization;
   - recommendation consumption;
   - scan history.

## Forms and Validation
1. Validate required fields on the client to improve UX.
2. Show clear and actionable error messages.
3. Do not rely only on frontend validation; backend is the final authority.

## Quality Rules
1. Avoid duplicated data-transformation logic.
2. Do not tightly couple UI components to endpoint internals.
3. Keep routing predictable with React Router.
4. Ensure baseline accessibility (labels, focus states, minimum contrast, clear interactive states).

## Frontend Security
1. Never store server secrets in frontend code.
2. Do not expose sensitive tokens in browser logs.
3. Avoid persisting sensitive data in `localStorage` without clear need and policy.

## Delivery Checklist
Before concluding frontend work:
1. confirm HTTP calls are centralized;
2. confirm no meaningful logic duplication remains;
3. confirm loading/error states on core flows;
4. confirm no backend files were changed.
