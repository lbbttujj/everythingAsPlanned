# Repository Guidelines

## Project Structure & Module Organization

- `app/` contains the Next.js App Router entry points, metadata, and global CSS.
- `components/` contains client-side UI features: `Dashboard`, forms, Today group tiles, the calendar, thoughts, shared lists, and goals. `task-category-artwork.tsx` provides decorative vector illustrations for Today groups.
- `lib/` contains domain types, repository access, goal-assessment scoring, category labels, and legacy `LocalStorage` migration.
- `docs/` contains product and architecture decisions in `project-log.md`.
- `CHANGELOG.md` records completed application changes with their actual Git commit hashes, user-visible behavior, validation, and known limitations. Read its latest entries when continuing work.
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

### Required task completion workflow

The user has explicitly requested automatic local commits after completed tasks. This authorization persists across chats for this repository.

1. After completing a task that changes files, run the relevant checks and create a local commit without asking for another confirmation. Commit only the task's changes; preserve unrelated user work. Do not make empty commits for questions or tasks with no file changes. If work is incomplete or a check fails, report that accurately rather than claiming completion.
2. Every new commit must have a concise scoped subject and an explanatory body in Russian. Describe what changed, why, what was checked, and any meaningful unverified behavior or limitation. Avoid vague subjects such as "changes" or "fix" without context.
3. Record each completed application change in `CHANGELOG.md`: date, actual commit hash, subject, human-readable behavior, validation results, and relevant limitations. Never invent a hash or record a planned change as completed. Obtain hashes from Git after creating the implementation commit.
4. Commit the journal update as a separate documentation commit when needed, with an explanatory body too. A commit that only maintains the journal or contributor instructions does not need a self-referential entry in `CHANGELOG.md`; its own Git message is the record. This avoids an endless chain of commits just to record the journal's latest hash.
5. Keep `docs/project-log.md` and other relevant specifications current when application behavior changes; `CHANGELOG.md` maps those changes to commits and does not replace architecture/design documentation.
6. Check final `git status` and report the created commit hashes. A request for automatic commits does not authorize automatic pushes, deployments, or rewriting earlier Git history.

## Architecture & Configuration Notes

The app is client-side with Supabase authentication and repositories; `LocalStorage` holds UI preferences and legacy records awaiting migration. Do not store secrets there. Preserve backward compatibility when changing `ActionItem` and legacy normalization.

Today groups, including empty user categories, start collapsed, use two columns, and expand independently across both columns in their existing order. An expanded group can create a task with that category preselected and its category selector hidden. Disclosure state is local to the mounted Today screen and does not change records. Illustrations derive from existing category `icon` and `color`; no image field is stored. Keep the colored left accent on group containers only. Tasks can have multiple private attachments; preserve full filenames and use an authenticated Storage download for previews or downloads.

Use `motion/react` for group layout and presence animation. Keep siblings in `LayoutGroup`, honor `MotionConfig reducedMotion="user"`, and avoid competing CSS transform transitions or manual DOM measurements. `app/design-system.css`, loaded after `app/globals.css`, is the current token/style layer.

Task composer keyboard positioning is separate from group animation: `components/action-modal-viewport.tsx` uses VisualViewport resize/scroll events and only scrolls the active field inside the sheet. Apply it only to task dialogs; keep the CSS fallback and clean up all listeners/animation frames. Verify the native keyboard on iOS/Android when a real device is available.

## ExecPlans

For complex features, significant refactors, or work expected to span multiple milestones, create and maintain an ExecPlan as described in `.agent/PLANS.md`. Use the plan from design through validation, record decisions and discoveries in it, and keep its progress current at every stopping point. Small fixes and isolated UI changes do not require an ExecPlan. When implementing a plan, proceed through the next milestone without asking the user to choose routine next steps.
