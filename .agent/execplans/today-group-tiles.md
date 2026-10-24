# Today: illustrated expandable group tiles

## Purpose / Big Picture

On Today, nonempty task groups start as illustrated tiles in two columns. Selecting a tile expands that group in place across both columns, revealing its existing task list. Selecting its header again collapses it. All neighboring groups and the sections below move smoothly. The full width means the available Today content width, not an overlay. Existing completion, editing, review, and deletion actions remain available.

## Progress

- [x] Inspect current grouping, CSS, documentation, and Motion documentation (2026-10-24 MSK).
- [x] Add Motion 14.6.0 and implement illustrated two-column groups with full-width expansion (2026-10-24 MSK).
- [x] Update current product, design, architecture, and contributor documentation, with historical-plan annotations (2026-10-24 MSK).
- [x] Verify types, lint, production build, responsive layout, toggling, task menus, and reduced-motion wiring; restore local development server (2026-10-24 MSK).

## Surprises & Discoveries

- `app/design-system.css` is loaded after `app/globals.css` and overrides legacy folder styles.
- A previous parallel production build corrupted the running dev server's `.next` directory. Stop dev before building and restart it afterward.
- One pending CSS change removes left accents from individual tasks. Preserve it; only group containers retain their accent.
- Task groups have user-defined `icon` and `color`, but no image field. Use decorative local SVG artwork based on those existing properties, including the uncategorized group. No database migration or image download is needed.
- Browser checks at 431 px showed collapsed groups at 186 px and expanded groups at 384 px, without horizontal overflow. First, second, and last groups expand; multiple groups can stay open. Enter/Space toggle correctly, and task menu items remain available.
- Native CSS chevron rotation must sit inside a layout-animated wrapper, because Motion owns the wrapper's transform. Split the chevron into wrapper/inner icon rather than competing transforms.
- TypeScript and ESLint passed after adding Motion. Production build requires escalation because sandbox blocks Next.js child processes (`spawn EPERM`).
- Final production build passed, then `npm run typecheck` passed. Dev was restarted successfully at `http://localhost:3000/` (managed session 35776).
- Responsive browser checks passed at 320, 431, and 1280 px, without horizontal overflow. Both dark and light themes are readable; the original dark theme and normal viewport were restored.
- Task menu opens, its Edit command opens the existing form, and Cancel returns to Today without writing records. Browser warning/error log is empty. Reduced-motion behavior was reviewed in source (`MotionConfig`, zero presence duration, and disabled chevron transition); system preference emulation was not available in the browser surface.

## Decision Log

- Decision: Use the `motion` package, imported from `motion/react`, for layout, presence, and reduced-motion behavior.
  Rationale: User explicitly requested an animation library; layout animation handles grid reflow without manual element measurements.
  Date/Author: 2026-10-24 / Codex.
- Decision: Start all groups collapsed and allow multiple expanded groups; retain original group order with normal grid auto-placement.
  Rationale: This preserves existing independent disclosure behavior while presenting the requested tile overview. Avoid dense grid packing that would disagree with keyboard order.
  Date/Author: 2026-10-24 / Codex.
- Decision: Update active documentation and annotate relevant old execution plans as historical, retaining their original progress evidence.
  Rationale: User asked that all descriptions of application behavior match the new interface, without rewriting unrelated auth/database rules.
  Date/Author: 2026-10-24 / Codex.

## Outcomes & Retrospective

Completed all three milestones. Illustrated two-column tiles, independent full-width disclosure, reduced-motion handling, and updated documentation are implemented. `npm run lint`, `npm run build`, `npm run typecheck`, and `git diff --check` pass. Browser checks cover mobile/desktop, both themes, multiple groups, keyboard toggling, and menu/Edit/Cancel. No user records, schema, or storage keys changed. Localhost is running with the finished tile overview; no commit or push was requested for this change.

## Context and Orientation

`components/dashboard.tsx` selects Today tasks and passes them to `components/today-list.tsx`. Today groups tasks by `TaskCategoryDefinition`; `lib/task-categories.ts` supplies category color styles and the uncategorized fallback. `lib/` also contains repository and legacy LocalStorage migration code. `app/` contains Next.js routes and CSS. `docs/project-log.md`, `design.md`, and `docs/design-system.md` describe behavior; `README.md` and `AGENTS.md` orient contributors. `package.json` and its lockfile declare runtime dependencies. LocalStorage is used for theme and legacy migration, not for the disclosure state.

## Plan of Work

Install Motion. Add a focused `components/task-category-artwork.tsx` component for decorative SVG artwork. Update Today with MotionConfig, LayoutGroup, layout-aware group containers and section siblings, semantic disclosure buttons, and presence animation of lists. Style a two-column grid, full-span expanded cards, compact open headers, visible keyboard focus, and responsive tile artwork. Update active documentation and historical plan notes where they describe the superseded Today group interface. Validate without altering user data.

## Concrete Steps

In `F:\planner`, run `npm install motion`, `npm run lint`, `npm run typecheck`. Stop the managed `npm run dev` session before `npm run build`. Run typecheck after build to avoid generated-type races. Restart `npm run dev` and check `http://localhost:3000/`. If sandbox prevents child processes or registry access, rerun the necessary command with scoped escalation.

## Validation and Acceptance

- Initial Today: two illustrated tiles per row; counts and names are readable; tasks have no colored left strip.
- Open first/second/last group: that card spans both columns, tasks appear, neighboring tiles reposition smoothly, no text stretching or horizontal overflow.
- Repeated toggles and multiple open groups work; collapse returns the group to a tile.
- Keyboard Enter/Space and `aria-expanded` agree with visible state; closed content cannot receive focus.
- Menus and edit form remain usable; avoid deleting or changing existing records during visual checks.
- Check narrow mobile and desktop, both themes, and reduced-motion behavior.
- `npm run lint`, `npm run build`, and `npm run typecheck` succeed; localhost is restored after build.

## Idempotence and Recovery

No data schema, storage keys, or records change. Dependency installation and checks are repeatable. Preserve unrelated changes. Do not delete user files or run build concurrently with dev. If build artifacts need recovery, stop dev first and only remove the verified generated `F:\planner\.next` directory.

## Interfaces and Dependencies

TodayList props and TaskCategoryDefinition stay compatible. Expanded group IDs exist only in component state. Artwork consumes a category icon; color comes from `--task-category-color`. Motion owns layout/presence transforms. `MotionConfig reducedMotion="user"` and reduced-motion-aware presence timings honor accessibility preferences.

## Milestones

1. Illustrated groups: implementation and dependency files; observable two-column/full-width behavior.
2. Documentation: current specifications describe tiles, illustrations, expansion, and animation ownership.
3. Verification: successful checks and browser evidence, with development server running at completion.
