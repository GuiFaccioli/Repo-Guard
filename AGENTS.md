# RepoGuard - Global Agent Guide

## 1) Product Vision
RepoGuard is a full-stack application that helps developers evaluate the health of their GitHub repositories with a focus on:
- basic security;
- early-stage code quality signals;
- maintenance and long-term sustainability.

Core product flow: authenticate with GitHub, list repositories, run scans, store results, and display a dashboard with score, recommendations, and history.

## 2) Official Project Stack
- Frontend: React + Vite + React Router
- Backend: Node.js + NestJS + Prisma
- Database: PostgreSQL
- Integrations: GitHub OAuth + GitHub REST API
- Analytics: Google Analytics 4 (GA4) + Measurement Protocol

Do not change the stack unless explicitly requested.

## 3) MVP Objective
Deliver a functional base that supports:
1. authentication via GitHub OAuth;
2. listing repositories for the authenticated user;
3. running initial checks (security, quality, maintenance);
4. persisting results in PostgreSQL;
5. a React dashboard with repository score, actionable recommendations, and scan history.

## 4) Working Rules
1. Strictly respect the requested task scope.
2. Do not implement unrequested features (scope creep).
3. For large tasks, create a step-by-step plan before implementation.
4. Prioritize small, reviewable, testable changes.
5. Document assumptions when context is missing.
6. Never run destructive commands without explicit request.

## 5) Mandatory Security Standards
1. Never expose OAuth tokens, refresh tokens, client secrets, or database credentials.
2. Treat `.env` as sensitive configuration, never as a versioned artifact.
3. Validate all external input (user data, webhooks, GitHub API responses, query params).
4. Avoid logging sensitive data (tokens, full email addresses, auth headers, private payloads).
5. Apply least privilege to GitHub permission scopes.

## 6) Agent Boundaries
1. Do not create or use real tokens/secrets.
2. Do not publish credentials in code, logs, examples, or docs.
3. Do not change global architecture without alignment.
4. Do not expand scope to include parallel tasks.
5. Do not start backend/frontend/database implementation when the task is documentation-only.

## 7) Required Validation Before Closing Any Task
1. Confirm the requested objective was fully delivered.
2. List changed files and technical impact per file.
3. Report risks, pending items, and decisions that need human validation.
4. Confirm no real credentials were created or exposed.
5. Suggest safe next steps with low execution risk.

## 8) Final Response Format for Each Task
Every final response from an agent must include:
1. summary of work completed;
2. list of created/changed files;
3. validations performed;
4. limitations or uncovered points;
5. recommended next steps.

## 9) Planning Rule for Large Tasks
Before implementing high-impact work (multiple modules, external integrations, data migrations, authentication, analytics), the agent must:
1. propose a short phased plan;
2. state risks per phase;
3. only then begin execution.

## 10) Scope Preservation Rule
If the request is specific (for example: docs-only, review-only, test-only), the agent must:
1. execute only that work type;
2. avoid product code changes outside scope;
3. report extra ideas only as recommendations, without automatic implementation.
