# RepoGuard Repository Analysis Flow

This document defines the official route and interaction flow for RepoGuard’s repository analysis experience.

It explains how the user moves from GitHub authentication to repository selection and then to a focused repository report.

---

## 1) Core Flow

The current official flow is:

1. User opens RepoGuard.
2. RepoGuard checks authentication.
3. If unauthenticated, RepoGuard starts GitHub OAuth automatically.
4. User authorizes RepoGuard on GitHub.
5. User lands on `/repositories`.
6. User selects one repository from a GitHub-like selector.
7. User clicks `Inspect repository`.
8. User enters `/repositories/:id`.
9. RepoGuard automatically runs Green Scan.
10. User sees a clean report for the selected repository.

The product should feel fast and focused.

The user should not be asked to make unnecessary decisions before receiving the first report.

---

## 2) Route Architecture

### `/`

Purpose:

Handle GitHub connection.

This page should be minimal and transitional.

It should:

- check current session;
- redirect authenticated users to `/repositories`;
- start GitHub OAuth automatically for unauthenticated users;
- show a minimal fallback button.

It should not:

- explain the whole product;
- show repositories;
- show scan modes;
- show reports;
- behave like a marketing landing page.

---

### `/repositories`

Purpose:

Help the authenticated user choose one repository.

This page is a selection screen.

It should show:

- RepoGuard identity;
- connected GitHub user;
- a short title;
- a short explanation;
- a GitHub-like repository selector;
- `Inspect repository` action.

It should not show:

- repository table by default;
- metric cards;
- scan mode selector;
- Green/Yellow/Red options;
- scan results;
- detailed checks;
- recommendations;
- unrelated dashboard sections.

The user goal is:

> Choose one repository to inspect.

---

### `/repositories/:id`

Purpose:

Show a focused report for one selected repository.

For V1:

- Green Scan runs automatically.
- Yellow and Red are not shown.
- The user does not select scan level.
- The report is generated for the selected repository only.

The user goal is:

> Understand what RepoGuard found and how to improve this repository.

---

## 3) `/` Wireframe

```text
┌──────────────────────────────────────────────┐
│                                              │
│                 🛡 RepoGuard                 │
│                                              │
│        Preparing GitHub connection...         │
│                                              │
│  You will be redirected to GitHub to authorize│
│  repository analysis.                         │
│                                              │
│        [Continue with GitHub]                 │
│                                              │
└──────────────────────────────────────────────┘
```

Rules:

- Keep it minimal.
- No marketing sections.
- No scan details.
- No repository data.
- No visual clutter.

---

## 4) `/repositories` Wireframe

Closed selector:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🛡 RepoGuard                                           @GuiFaccioli connected │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         Choose a repository                                  │
│          Select one GitHub project to generate a focused report.             │
│                                                                              │
│               ┌────────────────────────────────────────────┐                 │
│               │ GuiFaccioli / RepoGuard                ▼   │                 │
│               └────────────────────────────────────────────┘                 │
│                                                                              │
│                         [ Inspect repository ]                               │
│                                                                              │
│                 RepoGuard checks repository health,                           │
│                 maintainability and defensive security signals.               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

Open selector:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         Choose a repository                                  │
│          Select one GitHub project to generate a focused report.             │
│                                                                              │
│               ┌────────────────────────────────────────────┐                 │
│               │ GuiFaccioli / RepoGuard                ▲   │                 │
│               ├────────────────────────────────────────────┤                 │
│               │ GuiFaccioli / FlowLogin                    │                 │
│               │ GuiFaccioli / EspanolCoach                 │                 │
│               │ GuiFaccioli / FakeLogin                    │                 │
│               │ GuiFaccioli / google-analytics-mcp         │                 │
│               └────────────────────────────────────────────┘                 │
│                                                                              │
│                         [ Inspect repository ]                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

Rules:

- The selector is the main interaction.
- Do not show a full table by default.
- Do not show scan modes.
- Do not show scan results.
- Do not show metrics that distract from repository selection.
- Keep the page spacious and focused.

---

## 5) `/repositories/:id` Flow

When `/repositories/:id` loads:

1. Load authenticated session.
2. Load repository data.
3. Identify selected repository by route id.
4. Automatically start Green Scan.
5. Show scanning state.
6. When scan completes, show report.

Important:

- The page should not ask the user to choose scan level in V1.
- The page should not show scan mode cards.
- The page should not show a pre-scan decision screen.
- Green Scan should be automatic.
- Yellow and Red are future enhancements.

---

## 6) `/repositories/:id` Scanning State

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🛡 RepoGuard                                           @GuiFaccioli connected │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Back to repositories                                                       │
│                                                                              │
│ GuiFaccioli / FlowLogin                                                      │
│ Full-stack login and registration app.                                       │
│ JavaScript · public · last push May 25, 2026 · Open on GitHub                │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         Scanning repository                                  │
│                                                                              │
│        RepoGuard is checking repository health signals.                       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

Rules:

- Calm loading state.
- No empty report cards.
- No scan selector.
- No score until scan finishes.
- No unrelated repositories.

---

## 7) `/repositories/:id` Report State

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🛡 RepoGuard                                           @GuiFaccioli connected │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Back to repositories                                                       │
│                                                                              │
│ GuiFaccioli / FlowLogin                                                      │
│ Repository health report                                                     │
│                                                                              │
│ Score: 78        Status: Needs attention        Green Scan                   │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│ What RepoGuard inspected                                                     │
│                                                                              │
│ README · .gitignore · package.json · Dependabot · GitHub Actions             │
│ License · Recent activity · Issues · Pull requests                           │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│ What RepoGuard found                                                         │
│                                                                              │
│ 6 checks passed. 3 checks need attention.                                    │
│ This repository has basic documentation, but is missing automation signals.   │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│ What needs attention                                                         │
│                                                                              │
│ 1. Dependabot was not found                                                  │
│ 2. GitHub Actions workflow was not found                                     │
│ 3. License file was not found                                                │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│ How to fix                                                                   │
│                                                                              │
│ 1. Add .github/dependabot.yml                                                │
│    This helps GitHub monitor dependency updates.                             │
│                                                                              │
│ 2. Add a basic GitHub Actions workflow                                       │
│    Start with a simple build/test workflow on every push.                    │
│                                                                              │
│ 3. Add a LICENSE file                                                        │
│    This clarifies how other people can use or contribute to the project.     │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│ Detailed checks                                                              │
│                                                                              │
│ Check              Status       Severity       Message                       │
│ README             pass         medium         README file found.            │
│ Dependabot         fail         high           Dependabot was not found.     │
│ GitHub Actions     fail         high           No workflow was found.        │
└──────────────────────────────────────────────────────────────────────────────┘
```

Rules:

- Vertical report flow.
- Summary before details.
- No side panels.
- No dashboard grid.
- No unrelated repositories.
- No scan level selection.

---

## 8) Future Topics

These are future topics, not part of the current V1 flow:

- Yellow Scan UI;
- Red Scan UI;
- scan history;
- previous sessions;
- comparison over time;
- saved reports;
- database persistence;
- monitoring over time;
- notifications.

Do not design the current flow around these topics yet.

---

## 9) Implementation Rules

Future implementation must:

- preserve production OAuth;
- preserve real repository loading;
- preserve scan API behavior;
- avoid fake data;
- avoid extra information not requested;
- avoid old dashboard structures;
- include wireframes in screen-related prompts;
- follow the wireframes exactly.

If a section does not appear in the wireframe, do not render it by default.

If old CSS forces the old layout, remove or replace it.
