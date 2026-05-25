
┌──────────────────────────────────────────────────────────────┐
│ Header: RepoGuard | user GitHub | logout                     │
├───────────────┬──────────────────────────────────────────────┤
│ Scan Modes    │ Repository Health Overview                   │
│               │ [Avg score] [Scanned] [Attention] [Risk]     │
│ Green Scan    │                                              │
│ Yellow Scan   │ Repositories                                 │
│ Red Scan      │ ┌──────────────────────────────────────────┐ │
│               │ │ Repo name | Score | Status | Actions     │ │
│ Filters       │ │ Repo name | Score | Status | Actions     │ │
│               │ └──────────────────────────────────────────┘ │
└───────────────┴──────────────────────────────────────────────┘





# RepoGuard Design Direction

This document defines the official UI direction for RepoGuard redesign work.  
The existing reference sketch in `docs/design/design-direction.md` is preserved as a layout spirit artifact.

## 1) Design Objective

RepoGuard should become a desktop-first developer/security dashboard, not a mobile-first landing page.

Target interface qualities:
- technical;
- trustworthy;
- fast;
- practical;
- easy to understand;
- security-focused;
- GitHub-centered;
- app-like.

## 2) Reference Interpretation

Direction based on the reference layout:
- use the full available browser width;
- avoid narrow centered content as the primary layout;
- avoid excessive vertical stacking;
- organize information into clear horizontal areas;
- use dashboard/workspace composition;
- make repository analysis feel like an operational workspace;
- prioritize repository data and scan results over marketing sections.

## 3) Desktop-First Layout Direction (`/repositories`)

Primary layout structure:
- top header with RepoGuard identity, authenticated GitHub user, and session actions;
- left sidebar/panel for scan mode selection and scan context;
- main content area for overview metrics and repository list/table;
- optional right-side panel (or lower split panel on smaller desktop widths) for selected scan results;
- overview cards near the top of the main content;
- repository list/table designed to use horizontal space efficiently;
- scan result rendering in a dedicated structured panel, avoiding long page push-down.

## 4) Product Flow Reflected in Design

1. User authenticates with GitHub.
2. RepoGuard automatically runs the initial Green Scan.
3. User lands on a full-width dashboard workspace.
4. User sees repository health summary immediately.
5. User can run Yellow or Red scans for deeper analysis.
6. User inspects checks and recommendations in a focused result panel.

## 5) Scan Mode Visual Direction

### Green Scan
- purpose: basic repository hygiene;
- behavior: fast baseline scan;
- visual tone: safe, clean, success-oriented.

### Yellow Scan
- purpose: maintainability and code quality signals;
- behavior: deeper project structure and development-practice inspection;
- visual tone: attention, improvement, technical refinement.

### Red Scan
- purpose: defensive security pattern detection;
- behavior: potential risks only, never exploitation;
- visual tone: serious and careful, not alarmist.

## 6) Color Direction

Color system should communicate speed, practicality, ease of use, and security.

Recommended palette direction:
- deep navy / dark blue: trust and security base;
- cyan / teal: speed, technology, primary actions;
- green: safe scan outcomes and positive status;
- amber/yellow: attention and maintainability refinement;
- red: potential risk, used selectively and intentionally;
- neutral grays: text hierarchy, borders, and surfaces.

Constraint:
- do not use generic purple SaaS gradients.

## 7) Brand and Persona Direction

RepoGuard persona:
- medieval guardian archetype;
- friendly, calm, trustworthy;
- never aggressive or threatening;
- symbolizes protection, review, and repository defense;
- visual symbol direction: shield with GitHub-inspired cat silhouette;
- mascot usage limited to onboarding/empty states, not core dashboard clutter.

## 8) Logo Direction

Logo concept:
- shield shape;
- GitHub-inspired cat silhouette inside the shield;
- blue/cyan palette;
- must work as favicon, app logo, and header mark;
- should feel modern developer/security product, not game branding.

## 9) UI Component Principles

### Buttons
- clear, direct, action-oriented labels;
- strong primary action contrast for scan/auth actions.

### Cards
- compact, readable, dashboard-like;
- avoid oversized marketing-card proportions.

### Repository List
- desktop-density oriented (structured list/table behavior);
- show meaningful repository metadata without wasted space.

### Scan Result Panel
- clear score visibility;
- severity visibility at a glance;
- checks grouped or highly scannable;
- recommendations immediately actionable.

### Badges
- small, consistent, and semantic (status/severity/category).

### Loading States
- explain what is happening and what is being fetched/scanned.

### Error States
- calm and useful;
- avoid dramatic or alarmist language.

## 10) What to Avoid

- mobile-first stacked layout as the main desktop experience;
- generic SaaS landing-page composition;
- excessive marketing sections ahead of core actions;
- fake data presented as real data;
- decorative clutter;
- overly playful medieval theme;
- overusing mascot visuals in the workspace;
- framing Red Scan as an offensive hacking tool;
- using `README.md` as an internal design notebook.

## 11) Implementation Guidance for Future Frontend Tasks

For future redesign tasks:
- read `docs/design-direction.md` first;
- preserve current product functionality;
- redesign in small, reviewable steps;
- prioritize `/repositories` layout improvements first;
- keep backend/API behavior unchanged unless explicitly requested;
- run build validation before finishing;
- create a commit after file changes.
