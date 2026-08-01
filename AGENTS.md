# Repository Guidelines

## Project Structure & Module Organization

- `app/` contains the Next.js App Router entry points, metadata, and global CSS.
- `components/` contains client-side UI features: `Dashboard`, forms, the grouped table, and value selection.
- `lib/` contains domain types, goal-assessment questions and scoring, value labels, and `LocalStorage` persistence.
- `docs/` contains product and architecture decisions in `project-log.md`.
- There are currently no test files or static asset directories. Do not commit generated `.next/` output.

## Build, Test, and Development Commands

- `npm run dev` starts the local development server with hot reload.
- `npm run build` creates and validates the production build.
- `npm start` serves the latest production build on `localhost:3000`.
- `npm run typecheck` runs TypeScript validation without emitting files.
- `npm run lint` runs ESLint across the repository.

Run `npm run typecheck` and `npm run build` before handing off substantial changes. Use `npm run dev` for UI work.

## Coding Style & Naming Conventions

Use TypeScript and React functional components with two-space indentation, double quotes, and semicolons, matching the existing code. Use `PascalCase` for component files and exports, `camelCase` for functions and variables, and descriptive domain names such as `GoalAssessment` or `ActionItem`. Keep business rules in `lib/`; keep components focused on rendering and interaction. Prefer existing CSS classes and design tokens in `app/globals.css` over one-off inline styles.

## Testing Guidelines

No automated test framework is configured yet, and no coverage threshold exists. For UI changes, manually verify both add flows, table sorting, drag-and-drop ordering, editing, deletion, and persistence after reload. Add tests when a framework is introduced; use names that describe behavior, for example `goal-assessment.test.ts`.

## Commit & Pull Request Guidelines

The repository has no Git commits yet, so no established commit convention can be inferred. Use concise imperative messages, preferably scoped by area, such as `feat(goals): add block assessment`. Pull requests should explain the user-visible behavior, list validation commands, mention data-model or `LocalStorage` migrations, and include screenshots for visual changes.

## Architecture & Configuration Notes

The app is client-side and currently persists records under `LocalStorage`; do not store secrets there. Preserve backward compatibility when changing `ActionItem`, because older records are normalized as everyday actions in `lib/action-storage.ts`.

## ExecPlans

For complex features, significant refactors, or work expected to span multiple milestones, create and maintain an ExecPlan as described in `.agent/PLANS.md`. Use the plan from design through validation, record decisions and discoveries in it, and keep its progress current at every stopping point. Small fixes and isolated UI changes do not require an ExecPlan. When implementing a plan, proceed through the next milestone without asking the user to choose routine next steps.
