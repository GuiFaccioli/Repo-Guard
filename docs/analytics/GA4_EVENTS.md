# RepoGuard GA4 Events

## 1. Purpose

This document defines the Google Analytics 4 (GA4) events currently used in RepoGuard to understand product usage and educational engagement.

The goal is to measure flow adoption and learning behavior without sending sensitive repository evidence or security data to analytics.

## 2. Current implementation

GA4 is implemented in the frontend via:

- `frontend/src/lib/analytics.js`

The GA4 measurement ID is read from:

- `VITE_GA_MEASUREMENT_ID`

If `VITE_GA_MEASUREMENT_ID` is missing, analytics is safely disabled and all tracking calls behave as no-ops.

## 3. Events overview

| Event name | When it fires | Main question it answers |
| --- | --- | --- |
| `page_view` | On route/page navigation | Which pages are users visiting? |
| `scan_started` | When a repository scan starts | How many users start a repository scan? |
| `scan_completed` | When a scan finishes successfully | How many scans finish successfully? |
| `scan_failed` | When a scan fails | How often scans fail? |
| `whats_wrong_opened` | When users open a failed code safety "What's wrong?" link | Which failed code safety findings users investigate? |
| `learn_more_opened` | When users open improvement/learn-more links | Which improvement/learn-more actions users open? |
| `learn_why_this_matters_opened` | When users open educational links for passed checks | Which educational explanations users open for passed checks? |

## 4. Event details

### `page_view`

- Trigger: fired on route changes in the frontend.
- Safe parameters:
  - `page_path`
  - `page_title`
- Notes:
  - Route-level page tracking only.
  - No repository evidence fields are sent.

### `scan_started`

- Trigger: fired when scan execution begins.
- Safe parameters:
  - `scan_type`
  - `repository_owner` when public/safe
  - `repository_name` when public/safe
  - `repository_visibility` when available
- Notes:
  - Used to measure scan initiation.
  - Repository identity is limited to public-safe context only.

### `scan_completed`

- Trigger: fired after a successful scan response.
- Safe parameters:
  - `scan_type`
  - `repository_owner` when public/safe
  - `repository_name` when public/safe
  - `repository_visibility` when available
  - `failed_check_count`
  - `code_safety_failed_count`
  - `repository_health_failed_count`
- Notes:
  - Sends only aggregate counts, never raw findings/evidence.
  - Used to analyze completion rate and outcome shape.

### `scan_failed`

- Trigger: fired when scan execution fails.
- Safe parameters:
  - `scan_type`
  - `error_reason` as a generic safe value only
- Notes:
  - `error_reason` must stay generic (for example: `network_error`, `request_failed`, `unauthenticated`, `unknown`).
  - Do not send raw backend/frontend error details.

### `whats_wrong_opened`

- Trigger: fired when a user opens a failed code safety educational action ("What's wrong?").
- Safe parameters:
  - `link_type`
  - `check_id`
  - `check_category`
  - `repository_owner` when public/safe
  - `repository_name` when public/safe
- Notes:
  - Used for investigation behavior on failed code safety checks.
  - `link_type` should be `whats_wrong`.

### `learn_more_opened`

- Trigger: fired when a user opens a non-code-safety failed-check improvement link.
- Safe parameters:
  - `link_type`
  - `check_id`
  - `check_category`
  - `repository_owner` when public/safe
  - `repository_name` when public/safe
- Notes:
  - Used for improvement-oriented educational engagement.
  - `link_type` should be `learn_more`.

### `learn_why_this_matters_opened`

- Trigger: fired when a user opens educational context for a passed check.
- Safe parameters:
  - `link_type`
  - `check_id`
  - `check_category`
  - `repository_owner` when public/safe
  - `repository_name` when public/safe
- Notes:
  - Used to measure optional educational engagement on passed checks.
  - `link_type` should be `learn_why_this_matters`.

## 5. Forbidden analytics data

GA4 events must never include:

- GitHub tokens
- OAuth tokens
- auth cookies
- session IDs
- secrets
- `.env` contents
- `codeExcerpt`
- `codeContext`
- raw file content
- `filePath`
- `lineNumber`
- `githubFileUrl`
- `githubFolderUrl`
- `flaggedLineExplanation`
- raw stack traces
- raw error messages
- user email

## 6. How to validate events

Use browser DevTools network inspection:

1. Open DevTools.
2. Go to `Network`.
3. Filter by `collect` or `g/collect`.
4. Confirm requests to `https://www.google-analytics.com/g/collect`.
5. Inspect query params and validate `en=` (event name).

Event-name examples:

- `en=page_view`
- `en=scan_started`
- `en=scan_completed`
- `en=whats_wrong_opened`

For GA4 collect calls, HTTP `204 No Content` is expected.

## 7. GA4 DebugView checklist

- [ ] Open GA4 DebugView or Realtime.
- [ ] Open RepoGuard.
- [ ] Confirm `page_view`.
- [ ] Start scan.
- [ ] Confirm `scan_started`.
- [ ] Wait for success.
- [ ] Confirm `scan_completed`.
- [ ] Click "What's wrong?".
- [ ] Confirm `whats_wrong_opened`.
- [ ] Click "Learn why this matters".
- [ ] Confirm `learn_why_this_matters_opened`.

## 8. Product questions answered

This setup helps answer:

- Are users opening the app?
- Are users starting scans?
- Are scans completing successfully?
- Where are users getting errors?
- Which checks create the most investigation clicks?
- Are users engaging with educational guidance?

## 9. Future events

Future ideas (not implemented now):

- `official_doc_clicked`
- `repository_url_submitted`
- `checklist_selected`
- `report_opened`
- `guide_page_viewed`
- `scan_duration_bucket`
- `scan_result_empty`
- `copy_fix_example_clicked`

## 10. Maintenance rules

- Keep analytics events safe and minimal.
- Prefer counts/categories over raw evidence.
- Never send code or secrets to GA4.
- Update this document when adding, renaming, or removing analytics events.
- If a new event needs a new parameter, add it to the allowlist in analytics helper and document it here.
