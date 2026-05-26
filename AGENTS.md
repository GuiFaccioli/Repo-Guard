# RepoGuard - Global Agent Guide

## 1) Product Vision

RepoGuard is a full-stack application that helps developers inspect the health, maintainability, and defensive security signals of their GitHub repositories.

RepoGuard is not a dense dashboard or a score-based ranking tool.

Core product flow:

1. authenticate with GitHub;
2. load the authenticated user's public repositories;
3. let the user select one repository through a GitHub-like selector;
4. open the selected repository page;
5. automatically run the V1 Green Scan;
6. display a clean educational diagnosis report for that repository.

The report should explain:

- what RepoGuard inspected;
- what is correctly configured;
- what needs attention;
- how the user can learn more;
- how the user can fix each issue.

RepoGuard must prioritize clarity, focus, and practical guidance over raw data density.

---

## 2) Official Project Stack

- Frontend: React + Vite + React Router
- Backend: Node.js + NestJS + Prisma
- Database: PostgreSQL
- Integrations: GitHub OAuth + GitHub REST API
- Analytics: Google Analytics 4 (GA4) + Measurement Protocol

Do not change the stack unless explicitly requested.

---

## 3) MVP Objective

Deliver a functional V1 that supports:

1. authentication via GitHub OAuth;
2. listing repositories for the authenticated user;
3. selecting one repository through a minimal GitHub-like selector;
4. automatically running Green Scan on the selected repository;
5. displaying a clean vertical diagnosis report;
6. showing elegant status indicators for each check:
   - ✓ for correctly configured items;
   - ✕ for missing or attention-needed items;
7. guiding the user toward educational "Learn more" documentation for each check.

V1 should not center the experience around:

- repository scores;
- average scores;
- ranking dashboards;
- scan history;
- previous sessions;
- Yellow Scan UI;
- Red Scan UI;
- database persistence.

These can be future topics, but they are not the current primary MVP experience.

---

## 4) Working Rules

1. Strictly respect the requested task scope.
2. Do not implement unrequested features or scope creep.
3. For large tasks, create a step-by-step plan before implementation.
4. Prioritize small, reviewable, testable changes.
5. Document assumptions when context is missing.
6. Never run destructive commands without explicit request.
7. Preserve existing working behavior unless the task explicitly asks to change it.
8. Prefer simple, understandable implementation over unnecessary abstraction.

---

## 5) Mandatory Security Standards

1. Never expose OAuth tokens, refresh tokens, client secrets, session secrets, or database credentials.
2. Treat `.env` as sensitive configuration, never as a versioned artifact.
3. Validate all external input, including:
   - user data;
   - webhooks;
   - GitHub API responses;
   - route params;
   - query params;
   - request body data.
4. Avoid logging sensitive data:
   - tokens;
   - authorization codes;
   - full email addresses;
   - auth headers;
   - cookies;
   - private payloads;
   - secrets.
5. Apply least privilege to GitHub permission scopes.
6. Keep GitHub access tokens server-side only.
7. Do not expose tokens or secrets in frontend responses, UI, logs, docs, examples, or screenshots.

---

## 6) Agent Boundaries

1. Do not create or use real tokens/secrets.
2. Do not publish credentials in code, logs, examples, docs, or test output.
3. Do not change global architecture without alignment.
4. Do not expand scope to include parallel tasks.
5. Do not start backend/frontend/database implementation when the task is documentation-only.
6. Do not implement database persistence unless explicitly requested.
7. Do not implement Yellow Scan UI unless explicitly requested.
8. Do not implement Red Scan UI unless explicitly requested.
9. Do not introduce score-based UI unless explicitly requested.
10. Do not add new dependencies unless necessary and justified.

---

## 7) Required Validation Before Closing Any Task

Before closing any task, the agent must:

1. confirm the requested objective was fully delivered;
2. list changed files and technical impact per file;
3. report risks, pending items, and decisions that need human validation;
4. confirm no real credentials were created or exposed;
5. confirm no `.env`, token, secret, credential, private key, or sensitive file was added;
6. suggest safe next steps with low execution risk.

For frontend changes, run:

```bash
npm run build
```

inside `frontend/`, unless the prompt explicitly says not to.

For backend changes, run:

```bash
npm run build
```

inside `backend/`, unless the prompt explicitly says not to.

---

## 8) Final Response Format For Each Task

Every final response from an agent must include:

1. summary of work completed;
2. list of created/changed files;
3. validations performed;
4. limitations or uncovered points;
5. recommended next steps.

When files are changed, also include:

1. commit message;
2. commit hash;
3. push result;
4. final git status.

---

## 9) Planning Rule For Large Tasks

Before implementing high-impact work, the agent must:

1. propose a short phased plan;
2. state risks per phase;
3. only then begin execution.

High-impact work includes:

- multiple modules;
- external integrations;
- data migrations;
- authentication changes;
- OAuth changes;
- analytics changes;
- deployment configuration changes;
- API contract changes;
- database schema changes;
- security-related changes.

---

## 10) Scope Preservation Rule

If the request is specific, for example docs-only, review-only, test-only, frontend-only, or backend-only, the agent must:

1. execute only that work type;
2. avoid product code changes outside scope;
3. report extra ideas only as recommendations, without automatic implementation.

Examples:

- If the task is documentation-only, do not edit frontend or backend code.
- If the task is frontend-only, do not edit backend code.
- If the task is backend-only, do not edit frontend code.
- If the task is design-only, do not change runtime logic.

---

## 11) Commit Rule

Every task that changes files must end with a commit.

Before committing, the agent must:

1. run the required validations for the task;
2. run `git status`;
3. review `git diff`;
4. confirm no secrets, `.env` files, tokens, credentials, private keys, or sensitive files were added.

Commits must follow Conventional Commits, for example:

- `feat(auth): add GitHub OAuth foundation`
- `docs(readme): improve public project presentation`
- `fix(frontend): adjust onboarding layout`
- `docs(design): update repository report wireframe`

If no files were changed, do not create an empty commit.

After committing, push to `origin/main` unless the prompt explicitly says not to push.

---

## 12) Documentation Boundaries

`README.md` must remain public-facing, polished, and recruiter-friendly.

Do not use `README.md` as an internal development notebook.

Use:

- `README.md` for public product presentation;
- `docs/project-status.md` for roadmap, milestones, and implementation status;
- `docs/development-notes.md` for local setup, troubleshooting, ports, `.env` notes, and technical guidance;
- `docs/design/design-direction.md` for broad product and visual direction;
- `docs/design/repository-analysis-flow.md` for route and interaction flow;
- `docs/design/repository-report-wireframe.md` for the repository detail/report screen;
- `AGENTS.md` for global agent behavior rules;
- `agents/*.md` for specialist agent instructions.

Internal development details, troubleshooting notes, and temporary implementation status must live inside `docs/`, not in the root `README.md`.

---

## 13) Screen Design Rule

Whenever the task involves modeling, creating, editing, or refactoring a screen, the agent must follow the official design documents first:

- `docs/design/design-direction.md`
- `docs/design/repository-analysis-flow.md`
- `docs/design/repository-report-wireframe.md`

For screen-related tasks, the prompt must include a text wireframe.

The agent must follow the wireframe exactly.

The agent must not:

- add sections that are not present in the wireframe;
- reuse old layout structures if they conflict with the wireframe;
- add dashboard panels without explicit request;
- show information just because it exists in the API;
- introduce score-based UI unless explicitly requested;
- add Yellow Scan or Red Scan UI unless explicitly requested;
- render unrelated repositories on a repository detail page;
- add excessive badges, cards, or visual noise.

If old CSS forces an outdated dashboard layout, the agent must remove or replace that CSS instead of adapting the new UI into the old structure.

---

## 14) Current Design Direction Summary

The current V1 product direction is:

```text
/
→ automatic GitHub authentication

/repositories
→ minimal GitHub-like repository selector

/repositories/:id
→ automatic Green Scan

after scan
→ clean educational diagnosis report
```

The current V1 must avoid:

- score mentality;
- repository ranking;
- dense dashboard layouts;
- left/right result panels;
- scan mode selection before the first report;
- unrelated repositories on the detail page;
- excessive badges;
- fear-based security language.

The report should be educational and action-oriented.

Instead of score/severity-first thinking, RepoGuard should use:

- ✓ for correctly configured items;
- ✕ for items that need attention;
- `Learn more` links;
- documentation-style explanations;
- clear fix guidance.

---

## 15) Repository Report Rules

The repository report must focus on one selected repository only.

The report must not show:

- unrelated repositories;
- score;
- average score;
- ranking;
- severity-first UI;
- dashboard cards;
- scan mode selector;
- Yellow Scan UI;
- Red Scan UI;
- old side panels;
- old result panels.

The report should show:

1. project identity;
2. list of what RepoGuard checked;
3. what is correctly configured;
4. what needs attention;
5. detailed checks with:
   - check name;
   - elegant ✓ or ✕ status;
   - `Learn more`;
   - optional fix action.

The old `message` column should not be the main product experience.

The product should guide the user toward understanding and improvement.

---

## 16) Learn More / Documentation Direction

Each check should eventually support a documentation-style explanation.

A `Learn more` destination should explain:

1. what the item is;
2. why RepoGuard checks it;
3. why it matters;
4. how to fix it;
5. an example when useful.

Examples of documentation topics:

- README;
- `.gitignore`;
- `package.json`;
- Dependabot;
- GitHub Actions;
- LICENSE;
- Recent activity;
- Open issues;
- Open pull requests.

The tone must be educational, calm, and practical.

Avoid fearmongering language.

---

## 17) Confirmation Alert Rule

When the agent needs human confirmation before continuing, it must run:

```bash
powershell -c "[console]::beep(900,500)"
```

Then it must print:

```text
CONFIRMATION_REQUIRED:
- what needs confirmation;
- why confirmation is needed;
- safest available option;
- what will happen after approval.
```

The agent must stop and wait for the user's response before continuing.

This rule applies especially before:

- destructive commands;
- database resets;
- deleting files;
- changing authentication/OAuth behavior;
- changing environment variables;
- changing production deployment configuration;
- modifying architecture;
- adding new dependencies;
- changing API contracts;
- force pushing;
- rewriting Git history.

---

## 18) Safe Git And File Handling

The agent must never run destructive Git commands unless explicitly requested.

Do not run without explicit approval:

```bash
git reset --hard
git clean -fd
git push --force
git rebase
rm -rf
```

Before deleting or moving files, explain:

1. which files will be affected;
2. why the change is needed;
3. whether it can be undone;
4. safest alternative.

For documentation and design tasks, avoid touching application code.

For application tasks, avoid touching unrelated documentation unless explicitly useful.

---

## 19) Environment And Deployment Rules

Never commit real environment files.

Allowed:

- `.env.example`
- documentation that explains environment variables without real secrets.

Not allowed:

- `.env`
- `.env.local`
- `.env.production`
- files containing real tokens;
- files containing real secrets;
- files containing private keys.

Production configuration must remain explicit and safe.

For cross-domain frontend/backend auth:

- backend CORS must use explicit frontend origins;
- credentials must be enabled only for allowed origins;
- cookies must remain `httpOnly`;
- production cookies must use secure settings.

Do not weaken production OAuth/session behavior without explicit approval.

---

## 20) Frontend Rules

The frontend must:

1. preserve production OAuth/session flow;
2. call authenticated backend endpoints with `credentials: "include"` when needed;
3. avoid exposing GitHub tokens;
4. use real repository data only;
5. avoid fake data unless explicitly requested for a mockup;
6. avoid score-based UI unless explicitly requested;
7. avoid dashboard clutter;
8. follow the official wireframes for screen work.

For `/repositories`:

- show minimal GitHub-like repository selector;
- do not show repository table by default;
- do not show scan modes;
- do not show scan results.

For `/repositories/:id`:

- automatically run Green Scan in V1;
- do not show scan mode selector;
- do not show Scan project button;
- show clean educational diagnosis report after scan;
- use vertical report flow.

---

## 21) Backend Rules

The backend must:

1. keep GitHub tokens server-side only;
2. keep OAuth/session behavior secure;
3. validate external API responses;
4. avoid logging sensitive data;
5. avoid changing API contracts without explicit request;
6. keep endpoints small and understandable;
7. keep defensive scan behavior safe.

Red Scan, when implemented in the future, must remain defensive.

It must not:

- exploit vulnerabilities;
- generate attack payloads;
- provide offensive instructions;
- encourage misuse.

---

## 22) Database Rules

The official database direction is PostgreSQL with Prisma.

Database persistence is a future topic unless explicitly requested.

Do not implement database persistence automatically.

Do not create migrations unless explicitly requested.

Before any database migration or destructive database operation, request confirmation and follow the Confirmation Alert Rule.

---

## 23) Analytics Rules

Analytics direction is Google Analytics 4 plus Measurement Protocol.

Do not add analytics events unless explicitly requested.

Never send:

- OAuth tokens;
- secrets;
- private repository data;
- sensitive payloads;
- personally sensitive information.

Analytics events should be minimal, useful, and privacy-aware.

---

## 24) Final Checklist Before Finishing

Before final response, the agent must verify:

1. requested scope was followed;
2. no unrelated features were added;
3. required validations were run;
4. no secrets were added;
5. commit was created if files changed;
6. push was completed unless explicitly skipped;
7. final git status is reported;
8. limitations are clearly stated.

The agent's final response must be factual and concise.