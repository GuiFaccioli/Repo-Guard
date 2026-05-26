# RepoGuard Design Direction

This document defines the official product and visual direction for RepoGuard.

RepoGuard is a GitHub-first developer/security tool that helps users inspect repository health, maintainability, and defensive security signals.

The product should feel simple, focused, trustworthy, practical, and easy to understand.

---

## 1) Product Positioning

RepoGuard is not a generic SaaS dashboard.

RepoGuard is a focused repository diagnosis tool.

The core product promise is:

> Connect GitHub, choose one repository, and receive a clear report about what RepoGuard found and how to improve it.

The product should help developers understand repository problems quickly without overwhelming them with raw technical noise.

RepoGuard should not feel like:

- a dense admin dashboard;
- a marketing landing page;
- a security scare tool;
- a generic analytics workspace;
- a page full of panels just because data exists.

RepoGuard should feel like:

- a focused inspection flow;
- a clean developer/security tool;
- a practical repository report generator;
- a calm assistant that helps the user improve a project.

---

## 2) Current Official UX Flow

The current official UX flow is:

1. User opens RepoGuard.
2. RepoGuard automatically starts GitHub authentication when needed.
3. User authorizes RepoGuard on GitHub.
4. User lands on `/repositories`.
5. User selects one repository from a GitHub-like selector.
6. User clicks `Inspect repository`.
7. User enters `/repositories/:id`.
8. RepoGuard automatically runs the V1 Green Scan.
9. User sees a clean report for that selected repository.

For V1:

- Green Scan runs automatically on the repository detail page.
- Yellow Scan and Red Scan are future enhancements.
- The user should not choose scan level before seeing the first report.
- The first experience should be fast, direct, and minimal.

---

## 3) Core UX Principle

Summary first, details after.

RepoGuard should not show everything just because the API has the data.

If information does not help the user make the current decision, it should be hidden, moved lower on the page, or saved for a future interaction.

The product should always ask:

> What is the user trying to do on this screen?

Then the screen should show only what supports that decision.

---

## 4) Route Responsibilities

### `/`

Purpose:

Start the GitHub connection flow with minimum friction.

Behavior:

- Check if the user is already authenticated.
- If authenticated, redirect to `/repositories`.
- If unauthenticated, start GitHub OAuth automatically.
- Keep a manual `Continue with GitHub` fallback button.
- Do not show marketing content.
- Do not show repository data.
- Do not show scan modes.

Wireframe:

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

---

### `/repositories`

Purpose:

Let the authenticated user choose one repository to inspect.

This page is a repository selection screen.

It should not behave like a dashboard.

The user goal on this page is:

> Choose a repository.

Required elements:

- RepoGuard identity;
- connected GitHub user;
- short title;
- short supporting sentence;
- GitHub-like repository selector/dropdown;
- primary action: `Inspect repository`;
- short supporting text explaining what RepoGuard checks.

Do not show:

- repository table by default;
- overview metric cards;
- score cards;
- Green/Yellow/Red scan modes;
- full scan results;
- all checks;
- long recommendations;
- side panels;
- unrelated technical information;
- dashboard workspace layout.

Wireframe:

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

Dropdown open state:

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

---

### `/repositories/:id`

Purpose:

Show a clean report for one selected repository.

The page must focus only on the selected repository.

Other repositories must not compete for attention.

For V1, this page should automatically run Green Scan after repository data is available.

The user should not see a scan mode selector in V1.

The user should not need to click another scan button after already choosing the repository.

The user goal on this page is:

> Understand what RepoGuard found in this repository and how to improve it.

---

## 5) Repository Detail Behavior

### Before scan completes

This state should be short and temporary.

Show a calm loading state.

Do not show empty report sections.

Do not show score before scan completes.

Do not show scan mode selector.

Do not show Green/Yellow/Red options.

Wireframe:

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

---

### After scan completes

Show a clean vertical report.

Do not use the old dashboard grid.

Do not use a left scan panel.

Do not use a right scan result panel.

Do not show multiple floating panels.

Do not show unrelated repositories.

Wireframe:

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

Detailed checks should appear after the diagnosis, not before.

---

## 6) Deprecated Layout Patterns

These layout patterns are deprecated and should not be used for the main RepoGuard flow:

- dense dashboard workspace;
- left scan mode panel;
- right scan result panel;
- multi-column result dashboard;
- scan modes on `/repositories`;
- default repository table on `/repositories`;
- metric cards on `/repositories`;
- showing all available API information;
- showing scan details before the scan result exists;
- keeping old grid structures while hiding content;
- unrelated repositories visible on the detail page;
- visual noise caused by too many badges, cards, and panels.

If old CSS classes force this deprecated layout, remove or replace them.

Do not keep the old distribution just because it already exists.

---

## 7) Scan Modes

RepoGuard supports three scan concepts, but V1 should expose only the automatic Green Scan in the main flow.

### Green Scan

Basic repository hygiene.

Used for:

- README;
- `.gitignore`;
- `package.json`;
- Dependabot;
- GitHub Actions;
- License;
- recent activity;
- issues;
- pull requests.

V1 behavior:

- automatically runs on `/repositories/:id`;
- no user selection needed;
- generates the first repository report.

Tone:

- safe;
- baseline;
- fast;
- practical.

---

### Yellow Scan

Maintainability and quality.

Future UI enhancement.

Use it for:

- scripts;
- tests;
- documentation quality;
- project structure;
- `.env.example`;
- lockfiles;
- development setup.

Do not expose Yellow Scan in V1 unless explicitly requested.

---

### Red Scan

Defensive security risk pattern detection.

Future UI enhancement.

Use it for potential risks such as:

- committed `.env` files;
- possible hardcoded secrets;
- unsafe `eval` usage;
- suspicious SQL string concatenation patterns;
- overly permissive CORS patterns;
- sensitive logs;
- hardcoded API URLs or keys.

Important:

Red Scan must remain defensive.

It must not:

- exploit vulnerabilities;
- generate attack payloads;
- encourage offensive usage;
- use fearmongering language.

Use language like:

- “potential risk”;
- “review this pattern”;
- “consider changing this”;
- “this may expose sensitive behavior”.

Do not expose Red Scan in V1 unless explicitly requested.

---

## 8) Visual Direction

RepoGuard should feel like a modern developer/security tool.

The UI should be:

- desktop-first;
- clean;
- technical;
- trustworthy;
- fast;
- practical;
- minimal;
- GitHub-centered;
- security-aware.

Desktop-first does not mean showing everything at once.

It means:

- better spacing;
- stronger hierarchy;
- clearer reading flow;
- calm report sections;
- wide structure only when useful;
- less vertical crowding without adding noise.

Avoid:

- generic SaaS landing page style;
- excessive purple gradients;
- overly playful medieval theme;
- cluttered admin dashboard layout;
- too many floating panels;
- too many badges;
- dense information before the user asks for it.

---

## 9) Brand Persona

RepoGuard’s persona is a medieval guardian.

The guardian should feel:

- calm;
- friendly;
- trustworthy;
- protective;
- technical;
- not aggressive;
- not childish.

The persona represents:

- repository protection;
- review;
- guidance;
- prevention;
- safety.

The mascot can appear in:

- onboarding;
- empty states;
- brand moments;
- documentation;
- friendly guidance.

The mascot should not clutter the main repository report.

---

## 10) Logo Direction

The logo concept is:

- shield shape;
- GitHub-inspired cat silhouette inside;
- blue/cyan palette;
- modern security badge feeling.

The logo should work as:

- app mark;
- favicon;
- OAuth app icon;
- header identity;
- README brand mark.

The logo should feel like a modern developer/security product, not a game logo.

Recommended use:

- small shield mark in the header;
- larger shield mark in onboarding or OAuth app branding;
- mascot only when helpful, not everywhere.

---

## 11) Color Direction

The colors should communicate:

- speed;
- practicality;
- ease of use;
- security.

Suggested color system:

### Base

- Deep navy / dark blue: trust, security, technical foundation.
- Dark surfaces: developer-tool feeling.
- Neutral grays: text, borders, secondary UI.

### Accent

- Cyan / teal: speed, action, modern tooling.
- Green: success, safe baseline, Green Scan.
- Amber / yellow: attention, maintainability, Yellow Scan.
- Red: potential risk, Red Scan, used carefully.

Avoid using red as a fear signal.

Red should communicate:

> This deserves review.

Not:

> You are under attack.

---

## 12) Typography Direction

Typography should be:

- clean;
- readable;
- technical;
- calm.

Use a readable sans-serif for the interface.

A monospace font can be used for:

- repository names;
- file names;
- technical labels;
- code-like references.

Avoid typography that feels overly playful or generic AI-generated.

---

## 13) Component Principles

### Buttons

Buttons should be direct and action-oriented.

Examples:

- `Continue with GitHub`
- `Inspect repository`
- `Back to repositories`
- `Open on GitHub`
- `Retry Green Scan`

Avoid vague labels like:

- `Learn more`
- `Explore`
- `Continue` when the destination is unclear.

---

### Repository Selector

The repository selector should feel similar to a GitHub repository selector.

It should:

- show selected repository full name;
- show a caret open/closed;
- show repository full names in the dropdown;
- close after selecting;
- avoid extra clutter;
- optionally show subtle metadata like language or updated date.

It should not:

- become a full repository table;
- show scan details;
- show scores and checks;
- show dashboard metrics.

---

### Cards

Cards should be used with restraint.

A card should have a clear purpose.

Avoid creating many cards just to fill space.

---

### Report Sections

The report should be organized into clear vertical sections:

1. What RepoGuard inspected
2. What RepoGuard found
3. What needs attention
4. How to fix
5. Detailed checks

The detailed checks section should come last.

---

### Badges

Badges should be small and meaningful.

Use them for:

- scan type;
- severity;
- status;
- visibility.

Avoid excessive badges that make the UI noisy.

---

### Loading States

Loading states should explain what is happening.

Examples:

- “Checking your GitHub session…”
- “Loading repositories…”
- “Scanning repository…”

---

### Error States

Error states should be calm and useful.

They should explain:

- what failed;
- what the user can do next.

Avoid dramatic or frightening language.

---

## 14) Tone of Voice

RepoGuard should speak in a calm, technical, and accessible way.

The tone should be:

- direct;
- practical;
- helpful;
- clear;
- security-aware;
- not alarmist.

Use plain English.

Good examples:

- “Dependabot was not found.”
- “This repository may need dependency monitoring.”
- “Add a GitHub Actions workflow to validate changes.”
- “This pattern may expose sensitive information.”

Avoid:

- “Critical vulnerability detected!”
- “Your project is unsafe!”
- “Hacked!”
- “Exploit found!”

---

## 15) What To Avoid

Avoid:

- visual spam;
- dense admin dashboard patterns;
- showing all API data by default;
- scan results before the Green Scan completes;
- unrelated repositories on the detail page;
- multiple floating panels;
- overusing the mascot;
- generic SaaS marketing sections;
- fake GitHub data;
- fake scan data;
- fearmongering security language;
- using README.md as an internal design notebook.

---

## 16) Future Topics

These are future topics, not the current primary UX:

- Yellow Scan UI;
- Red Scan UI;
- scan history;
- previous sessions;
- comparison over time;
- saved reports;
- database persistence;
- team accounts;
- repository monitoring over time;
- notifications.

Do not center the current UI around these topics yet.

The current focus is:

> Choose a repository, run automatic Green Scan, read a clean report.

---

## 17) Relationship With Other Design Docs

This file defines the broad product and visual direction.

More specific files should guide more specific decisions:

- `docs/design/repository-analysis-flow.md`
  - defines the route split between `/repositories` and `/repositories/:id`.

- `docs/design/repository-report-wireframe.md`
  - defines the most specific structure for the repository detail/report screen.

When working on `/repositories/:id`, follow `repository-report-wireframe.md` first.

When working on broader visual identity, follow this file.

If a more specific wireframe conflicts with this document, follow the more specific wireframe.

---

## 18) Implementation Guidance

Future frontend tasks should:

- read this document first;
- read `docs/design/repository-analysis-flow.md`;
- read `docs/design/repository-report-wireframe.md` when working on repository detail pages;
- preserve production OAuth;
- preserve real repository loading;
- preserve scan API behavior;
- avoid fake data;
- avoid extra information not requested;
- avoid old dashboard grid structures;
- implement in small steps;
- validate frontend build;
- commit and push after changes.

When modeling, creating, editing, or refactoring a screen:

- include a text wireframe in the implementation prompt;
- follow the wireframe exactly;
- do not add sections that are not present in the wireframe;
- do not reuse old layout structures if they conflict with the wireframe.

The goal is not to show everything.

The goal is to help the user understand what matters.
