# RepoGuard Repository Report Wireframe

This document is the official UX reference for repository detail/report implementations based on the latest hand-drawn wireframe direction.

## 1) Core Rule

The repository detail experience must be minimal and focused.

Only show what the user needs at that moment.

Before scan:
- selected project;
- option to choose/view another project;
- primary scan action.

After scan:
- clean report for the scanned project only.

## 2) Pre-Scan Wireframe

```text
┌──────────────────────────────────────────────┐
│ HEADER                                       │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────────┐  ┌──────────────┐ │
│  │ Selected project     │  │ Scan project │ │
│  │ Projeto X            │  │              │ │
│  └──────────────────────┘  └──────────────┘ │
│                                              │
│  ┌──────────────────────┐                    │
│  │ View all projects /  │                    │
│  │ choose another       │                    │
│  └──────────────────────┘                    │
│                                              │
├──────────────────────────────────────────────┤
│ FOOTER                                       │
└──────────────────────────────────────────────┘
```

## 3) Pre-Scan Page Rules

The pre-scan page must NOT show:
- full check lists;
- recommendations;
- score cards;
- multiple scan result panels;
- all repositories competing for attention;
- long technical explanations;
- history/sessions;
- raw API details.

The pre-scan page should show only:
- project identity;
- short supporting description if needed;
- link to GitHub if useful;
- scan action;
- option to choose another project.

## 4) Post-Scan Report Wireframe

After scanning, the user should see a separate clean report state/page:

```text
┌──────────────────────────────────────────────┐
│ HEADER                                       │
├──────────────────────────────────────────────┤
│ Project report                               │
│ Projeto X                                    │
│ Score / status                               │
├──────────────────────────────────────────────┤
│ What RepoGuard inspected                     │
├──────────────────────────────────────────────┤
│ What RepoGuard found                         │
├──────────────────────────────────────────────┤
│ What needs attention                         │
├──────────────────────────────────────────────┤
│ How to fix                                   │
├──────────────────────────────────────────────┤
│ Detailed checks                              │
├──────────────────────────────────────────────┤
│ FOOTER                                       │
└──────────────────────────────────────────────┘
```

## 5) Post-Scan Page Rules

The report page should:
- focus only on the scanned project;
- show summary first;
- show details later;
- use plain language;
- explain what was inspected;
- explain what was found;
- explain what is wrong;
- explain how to fix it.

The report page must NOT:
- show unrelated repositories;
- show dashboard clutter;
- show multiple floating panels;
- show excessive badges;
- show raw check data before the summary;
- use fearmongering language.

## 6) Future Implementation Instruction

For all future frontend work on `/repositories/:id`:
- read this file first;
- follow the wireframe structure;
- preserve minimalism;
- do not add extra information unless explicitly requested;
- if a field is not needed for the current user decision, hide it or move it below the fold;
- prioritize user focus over data completeness.

## 7) Relationship With Existing Docs

This file is more specific than:
- `docs/design/design-direction.md`;
- `docs/design/repository-analysis-flow.md`.

When working specifically on the repository detail/report screen, this file should guide layout decisions first.
