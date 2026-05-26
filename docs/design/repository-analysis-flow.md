# RepoGuard Repository Analysis Flow

This document defines the official UX flow for repository analysis in RepoGuard.
It must be used as a baseline before future frontend redesign work.

## 1) Core UX Principle

- Summary first, details after.
- Users should not see every check and recommendation for all repositories at once.
- Once a repository is selected, the interface must focus only on that repository.

## 2) Route Architecture

- `/repositories`
  - Repository overview and selection page.
  - Purpose: compare repositories quickly and choose one to inspect.

- `/repositories/:id`
  - Focused analysis page for a single repository.
  - Purpose: present full diagnosis without competition from other repositories.

## 3) `/repositories` Responsibilities

The overview page must:
- show the authenticated GitHub user;
- show summary metrics;
- show a clean repository list/table;
- show repository name, language, last push date, score/status (if available), and top issue (if available);
- provide a primary action: `View analysis` or `Analyze repository`.

The overview page must avoid:
- full scan result panels by default;
- complete checks/recommendations for one repository inline in the list page;
- long recommendation blocks that create visual noise.

## 4) `/repositories/:id` Responsibilities

The detail page must:
- show repository identity (name, full name, description, language, visibility, last push, GitHub link);
- show score/status summary for the selected repository;
- provide Green/Yellow/Red scan actions;
- organize diagnosis into:
  - What RepoGuard inspected;
  - What RepoGuard found;
  - What needs attention;
  - How to fix;
  - Detailed checks.

The detail page must keep focus:
- other repositories should not compete for attention;
- the selected repository should be the central context for all actions and results.

## 5) Future Topics (Not Primary UX Scope Yet)

- scan history;
- previous sessions;
- comparison over time;
- saved reports;
- database persistence.

These topics are roadmap items and should not overload the primary repository selection and diagnosis flow.

## 6) Implementation Rules

Future implementation work must:
- preserve production OAuth behavior;
- preserve real repository loading from the current backend flow;
- preserve scan API calls and existing contracts;
- avoid fake data in production-facing views;
- avoid visual spam and excessive panel competition;
- keep `README.md` public-facing and not as internal design notes;
- read this document before starting future frontend redesign tasks.
