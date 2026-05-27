# RepoGuard Repository Analysis Flow (Current)

This document reflects the currently implemented flow.

## 1) Active user paths

RepoGuard currently exposes two analysis paths:

### A. OAuth repository path
1. User authenticates with GitHub.
2. User goes to `/repositories`.
3. User selects a public repository.
4. User opens `/repositories/:id`.
5. Frontend auto-triggers `POST /repositories/:id/scans`.
6. Backend returns single `general` scan with didactic checks.
7. Frontend renders educational report with green/yellow/red per check.

### B. URL-based path
1. User opens `/`.
2. User can submit a repository URL and checklists.
3. Frontend calls `POST /scans`.
4. Backend returns deterministic checklist results + safe evidence + aiReview summary.

## 2) Repository detail report behavior (`/repositories/:id`)

- No global score in report.
- No scan mode selector.
- Didactic checks are primary render source.
- Each check can link to guide page `/repositories/:id/checks/:checkId`.

Rendered emphasis:
- What was checked
- Why it matters
- What was found
- Suggested action
- Confidence and uncertainty note (when present)
- Supporting sources

## 3) Current constraints

- OAuth repository scan supports public repositories only.
- URL scan and OAuth scan use different backend contracts.
- Existing analytics events are privacy-sanitized and do not include raw evidence payloads.

## 4) Non-goals for this document

- Future idealized wireframes.
- Unimplemented private-repository behavior.
- Historical score/mode UX no longer in active repository report flow.
