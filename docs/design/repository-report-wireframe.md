# RepoGuard Repository Report Wireframe

This document is the official UX reference for the repository detail/report screen.

It is based on the current hand-drawn wireframe direction and the V1 product decision:

> After the user selects a repository, RepoGuard should automatically run the Green Scan and show a clean report.

This file is the most specific source for `/repositories/:id`.

When working on the repository detail/report page, follow this file before using broader design documents.

---

## 1) Core Rule

The repository detail experience must be minimal, focused, and report-driven.

The page must focus only on the selected repository.

Do not show unrelated repositories.

Do not show information just because it exists in the API.

Do not reuse old dashboard layouts.

Only show what helps the user understand:

- which repository was inspected;
- what RepoGuard checked;
- what RepoGuard found;
- what needs attention;
- how to fix it.

---

## 2) V1 Product Decision

For V1, `/repositories/:id` automatically runs the Green Scan.

The user should not choose a scan level on this page.

The user should not see:

- Green / Yellow / Red scan options;
- scan mode selector;
- `Scan project` button;
- pre-scan score cards;
- empty report sections before scan.

The expected V1 flow is:

1. User authenticates with GitHub.
2. User lands on `/repositories`.
3. User selects one repository.
4. User clicks `Inspect repository`.
5. User enters `/repositories/:id`.
6. RepoGuard automatically runs Green Scan.
7. User sees a clean report for that repository.

Yellow Scan and Red Scan are future enhancements.

They should not appear in V1 unless explicitly requested.

---

## 3) `/repositories/:id` Loading / Scanning State

This is the temporary state shown while the automatic Green Scan is running.

It should be calm, minimal, and focused.

It should not show incomplete report sections.

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
│              RepoGuard is checking repository health signals.                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Loading / Scanning Rules

This state should show only:

- header;
- selected repository identity;
- minimal repository metadata;
- link back to repositories;
- calm scanning message.

This state must not show:

- scan mode selector;
- Green / Yellow / Red options;
- score cards;
- recommendations;
- detailed checks;
- empty report sections;
- unrelated repositories;
- dashboard columns;
- side panels.

---

## 4) `/repositories/:id` Post-Scan Report Wireframe

After Green Scan completes, the user should see a clean vertical report.

This page should feel like a focused project report, not a dashboard.

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

---

## 5) Post-Scan Report Rules

The report page should:

- focus only on the scanned repository;
- use a vertical report structure;
- show summary before details;
- use plain language;
- explain what was inspected;
- explain what was found;
- explain what needs attention;
- explain how to fix it;
- place detailed checks at the bottom.

The report page must not:

- show unrelated repositories;
- show a left scan panel;
- show a right scan result panel;
- show multiple floating panels;
- show dashboard clutter;
- show excessive badges;
- show raw check data before the summary;
- use fearmongering language;
- ask the user to choose scan level in V1.

---

## 6) Deprecated Detail Page Layout

The old repository detail layout is deprecated.

Do not use:

```text
┌──────────────────────────────┬──────────────────────────────┐
│ Repository / scan controls   │ Scan result side panel        │
│ Dashboard cards              │ Checks / recommendations      │
└──────────────────────────────┴──────────────────────────────┘
```

Do not use:

- old dashboard grid;
- two-column result panel layout;
- right-side scan panel;
- scan mode cards before report;
- metric cards before scan;
- many badges competing with content;
- empty diagnosis cards before scan.

If old CSS classes force this layout, remove or replace them.

Do not keep the old distribution just because it already exists.

---

## 7) Error / Retry State

If the automatic Green Scan fails, show a calm retry state.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🛡 RepoGuard                                           @GuiFaccioli connected │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Back to repositories                                                       │
│                                                                              │
│ GuiFaccioli / FlowLogin                                                      │
│ Repository health report                                                     │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│ Scan could not be completed                                                  │
│                                                                              │
│ RepoGuard could not finish the Green Scan for this repository.               │
│ You can try again.                                                           │
│                                                                              │
│ [ Retry Green Scan ]                                                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

Error state rules:

- be calm;
- do not blame the user;
- do not expose internal tokens, errors, or raw payloads;
- provide a clear retry action;
- keep `Back to repositories` visible.

---

## 8) Future Scan Levels

Yellow Scan and Red Scan are future UI topics.

They should not appear in the V1 repository detail/report screen.

Future direction:

- Green Scan = automatic baseline report;
- Yellow Scan = optional deeper maintainability review;
- Red Scan = optional defensive security pattern review.

When Yellow/Red are added later, they should not clutter the initial report.

They should appear as a secondary action after the first Green report exists.

---

## 9) Implementation Rules For `/repositories/:id`

For all future frontend work on `/repositories/:id`:

- read this file first;
- follow the wireframe structure exactly;
- preserve minimalism;
- keep the vertical report flow;
- do not add extra information unless explicitly requested;
- do not render fields only because they exist in the API;
- hide or move non-essential fields below the fold;
- prioritize user focus over data completeness;
- preserve production OAuth;
- preserve real repository loading;
- preserve scan API behavior;
- avoid fake data;
- do not expose GitHub tokens;
- do not change backend contracts unless explicitly requested.

If a component or section does not appear in the wireframe, do not render it by default.

---

## 10) Relationship With Existing Docs

This file is more specific than:

- `docs/design/design-direction.md`;
- `docs/design/repository-analysis-flow.md`.

When working specifically on the repository detail/report screen, this file should guide layout decisions first.

If this file conflicts with a broader design document, follow this file for `/repositories/:id`.

---

## 11) Current V1 Summary

The current V1 repository detail experience is:

> User chooses a repository, RepoGuard automatically runs Green Scan, and the user receives a clean vertical report.

The page should not ask the user what scan type they want yet.

The page should not behave like a dashboard.

The page should behave like a focused report.
