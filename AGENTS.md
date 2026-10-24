# Repository Guidelines

## Project Structure & Module Organization

- `app/` contains the Next.js App Router entry points, metadata, and global CSS.
- `components/` contains client-side UI features: `Dashboard`, forms, Today group tiles, the calendar, thoughts, shared lists, and goals. `task-category-artwork.tsx` provides decorative vector illustrations for Today groups.
- `lib/` contains domain types, repository access, goal-assessment scoring, category labels, and legacy `LocalStorage` migration.
- `docs/` contains product and architecture decisions in `project-log.md`.
- `public/` contains PWA assets. Do not commit generated `.next/` output.

## Build, Test, and Development Commands

- `npm run dev` starts the local development server with hot reload.
- `npm run build` creates and validates the production build.
- `npm start` serves the latest production build on `localhost:3000`.
- `npm run typecheck` runs TypeScript validation without emitting files.
- `npm run lint` runs ESLint across the repository.

Run `npm run typecheck` and `npm run build` before handing off substantial changes. Use `npm run dev` for UI work.

Stop the dev server before `npm run build`; they share `.next` and concurrent execution can break localhost. Run typecheck after the build finishes generating types, then restart dev.

## Coding Style & Naming Conventions

Use TypeScript and React functional components with two-space indentation, double quotes, and semicolons, matching the existing code. Use `PascalCase` for component files and exports, `camelCase` for functions and variables, and descriptive domain names such as `GoalAssessment` or `ActionItem`. Keep business rules in `lib/`; keep components focused on rendering and interaction. Prefer existing CSS classes and design tokens in `app/globals.css` over one-off inline styles.

## Testing Guidelines

No automated test framework is configured yet, and no coverage threshold exists. For UI changes, manually verify both add flows, table sorting, drag-and-drop ordering, editing, deletion, and persistence after reload. Add tests when a framework is introduced; use names that describe behavior, for example `goal-assessment.test.ts`.

For Today groups, verify the initial two-column illustrated tile grid, opening first/second/last groups at full content width, multiple open groups, collapsing, keyboard toggling, menus, narrow screens, both themes, and reduced motion. Do not mutate existing user records merely to check appearance.

## Commit & Pull Request Guidelines

Use concise imperative commit messages, preferably scoped by area, such as `feat(goals): add block assessment`. Pull requests should explain the user-visible behavior, list validation commands, mention data-model or `LocalStorage` migrations, and include screenshots for visual changes.

## Architecture & Configuration Notes

The app is client-side with Supabase authentication and repositories; `LocalStorage` holds UI preferences and legacy records awaiting migration. Do not store secrets there. Preserve backward compatibility when changing `ActionItem` and legacy normalization.

Today groups start collapsed, use two columns, and expand independently across both columns in their existing order. Disclosure state is local to the mounted Today screen and does not change records. Illustrations derive from existing category `icon` and `color`; no image field is stored. Keep the colored left accent on group containers only.

Use `motion/react` for group layout and presence animation. Keep siblings in `LayoutGroup`, honor `MotionConfig reducedMotion="user"`, and avoid competing CSS transform transitions or manual DOM measurements. `app/design-system.css`, loaded after `app/globals.css`, is the current token/style layer.

## ExecPlans

For complex features, significant refactors, or work expected to span multiple milestones, create and maintain an ExecPlan as described in `.agent/PLANS.md`. Use the plan from design through validation, record decisions and discoveries in it, and keep its progress current at every stopping point. Small fixes and isolated UI changes do not require an ExecPlan. When implementing a plan, proceed through the next milestone without asking the user to choose routine next steps.
