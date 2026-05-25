# RepoGuard

GitHub repository health, security, and maintenance monitoring.

RepoGuard is a full-stack portfolio project designed to connect with GitHub, analyze repositories, and present clear repository health insights through a practical developer dashboard.

## Live Demo
- https://repo-guard-beta.vercel.app/

## What RepoGuard Will Analyze
- README
- .gitignore
- Dependabot configuration
- GitHub Actions
- License
- Last activity
- Open issues
- Open pull requests

## Product Flow
1. Connect GitHub
2. Scan repositories
3. View repository health score
4. Review recommendations

## Tech Stack
Frontend:
- React
- Vite
- React Router

Backend:
- Node.js
- NestJS

Database:
- PostgreSQL
- Prisma

Integrations:
- GitHub OAuth
- GitHub REST API
- Google Analytics 4

## Current Stage
Current milestone: GitHub-first frontend onboarding and OAuth backend foundation.

RepoGuard is being built incrementally. The full repository scan engine and production-grade analytics pipeline are part of the upcoming milestones.

## Project Status and Roadmap
- Implementation progress and milestones: [docs/project-status.md](docs/project-status.md)

## Local Development
- Setup, environment files, local OAuth notes, and troubleshooting: [docs/development-notes.md](docs/development-notes.md)

## AI-Assisted Development
This project uses [AGENTS.md](AGENTS.md) plus specialized instruction files in [`agents/`](agents/) to guide consistent AI-assisted development workflows.
