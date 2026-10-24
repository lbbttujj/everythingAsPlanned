# Mobile sorting and illustrated Thoughts tiles

## Purpose / Big Picture

In Personal Thoughts, a group should look like the illustrated two-column group tiles on Today. On a phone, touching and holding any tile starts a visible drag; moving it across the grid and releasing changes its position and keeps that order after reload. A normal tap still opens the group, and scrolling still works. The redundant "Пространство без срока" kicker above Thoughts is removed.

## Progress

- [x] Inspect current Thoughts interactions, Today artwork, CSS, and persistence (2026-10-24 MSK).
- [x] Replace handle-only touch/HTML drag with an accessible sortable grid, long-press touch activation and a floating drag preview (2026-10-24 MSK).
- [x] Apply illustrated card design in dark/light themes and update product/developer documentation (2026-10-24 MSK).
- [x] Verify layout, mouse/keyboard, persistence, checks and localhost (2026-10-24 MSK).
- [x] Commit implementation as `c036686` and record its hash in CHANGELOG (2026-10-24 MSK).

## Surprises & Discoveries

- Current touch drag starts on pointer-down of a 26 px span. There is no long-press delay or floating tile, and position changes only after asynchronous saves finish.
- The existing `TaskCategoryArtwork` is decorative, works with arbitrary group icons, and can be reused with a group-specific color token.
- Thoughts groups already persist `position` in Supabase through `saveBacklogGroup`; no schema change is needed.
- The normal sandbox npm cache has no `@dnd-kit/core`; the official registry is reachable through approved elevated npm access. Current stable core reports 6.3.1.
- With two real sibling groups, keyboard Space → ArrowRight → Space and pointer dragging both changed the order immediately; reload preserved it. Both test moves were reversed to restore the user's starting order. A normal click still opened a group.
- Escape canceled an active keyboard drag without changing the order. Dark and light screenshots showed readable two-column illustrated cards; the prior dark theme was restored.
- The desktop in-app browser cannot emulate a physical long-press touch gesture. Touch behavior is configured by the library sensor with a 240 ms delay and 7 px tolerance, and must still be confirmed on a phone.

## Decision Log

- Decision: Use the stable `@dnd-kit/core` plus `@dnd-kit/sortable` grid primitives with a delayed touch sensor, movement threshold for a mouse, and keyboard sorting.
  Rationale: They provide measured grid collision, item displacement and overlay without maintaining gesture timers and hit-testing ourselves.
  Date/Author: 2026-10-24 / Codex.
- Decision: Reuse Today SVG artwork with a deterministic palette based on group ID and existing semantic surface tokens.
  Rationale: Current `BacklogGroup` has an icon but no color. Stable local colors avoid changing persisted data.
  Date/Author: 2026-10-24 / Codex.
- Decision: Update order optimistically, then persist sibling positions, rolling back only that reorder if saving fails.
  Rationale: A dropped tile should stay where released instead of snapping back while waiting for network.
  Date/Author: 2026-10-24 / Codex.

## Outcomes & Retrospective

The illustrated two-column Thoughts grid and removal of the kicker are visible in the local browser. The Dnd Kit interaction, navigation tap, optimistic save, reload persistence, Escape cancellation, both themes and restoration of original order were verified with mouse/keyboard. `npm run lint`, `npm run build`, `npm run typecheck` and `git diff --check` passed; localhost was restarted and opened successfully. Implementation commit `c036686` is recorded in the journal. Physical long-press touch remains untested.

## Context and Orientation

`components/backlog-board.tsx` renders personal Thoughts groups in `thoughts-grid` and provides group navigation; `components/dashboard.tsx` owns `backlogGroups` and writes via `saveBacklogGroup` in `lib/planner-repository.ts`. `app/globals.css` contains older Thoughts styles; `app/design-system.css` is the current token layer loaded after it. `components/task-category-artwork.tsx` renders the illustrated paper icon used by Today. `docs/project-log.md`, `docs/design-system.md`, `design.md`, README and AGENTS.md describe app behavior. `LocalStorage` is not used for the current group order.

## Plan of Work

Install the stable Dnd Kit core/sortable/utilities packages and lock them in package files. Extract a sortable tile component so the hook is called at stable component boundaries. Use `DndContext` and `SortableContext` with a grid sorting strategy, delayed touch activation, mouse distance activation, and keyboard coordinates; show `DragOverlay` while dragging. Keep a normal tile click for navigation, suppress its click after dragging. Add a small non-interactive visual hold hint. Update Dashboard reorder so the new sibling positions render immediately and persist safely. Reuse `TaskCategoryArtwork`, add semantic palette styles, and remove the kicker. Update documents, validate, then commit and journal.

## Concrete Steps

Work in `F:\planner`. Install packages with npm; if offline cache blocks, use approved network access without editing dependencies by hand. Edit code/docs with `apply_patch`. Run `npm run lint`, `npm run typecheck`, and `git diff --check`. Stop the dev server before `npm run build`, then restart `npm run dev`. Inspect localhost at phone width and desktop width. Do not reorder live user records solely for testing unless that is within the user's requested order; use a reversible test or controlled temporary records if needed.

## Validation and Acceptance

- At 320–430 px, two illustrated tiles fit without horizontal scrolling; titles/counts stay legible. Dark and light surfaces use current tokens.
- A tap opens a group; a quick swipe can scroll; pressing and holding the tile enters drag mode and the dragged card follows the pointer. Adjacent tiles make room. Releasing over a sibling changes order and the new order remains after reload.
- Dropping outside a valid target, canceling, or pressing Escape leaves order unchanged. Keyboard sorting is reachable and visible. Only groups with the same parent can be reordered.
- `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` pass. Localhost runs at handoff.
- "Пространство без срока" is absent from both personal and shared Thoughts headers.

## Idempotence and Recovery

Package install can be repeated from lockfile. No database migration or object deletion occurs. A failed persistence attempt restores prior sibling positions and shows an error; unrelated groups and notes remain intact. Keep user work unmodified. Stop the dev server before rebuilding to avoid clobbering shared `.next` output.

## Interfaces and Dependencies

`BacklogBoard` continues receiving `BacklogGroup[]` with `id`, `parentId`, `order`, `icon`, `title` and notes. `onReorderGroups(sourceId, targetId)` reorders siblings; Dashboard persists position. New dependencies are `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities`. No new route, storage key or database column.

## Milestones

1. Gesture: held tile can move across the two-column grid; tap/scroll/keyboard remain distinct.
2. Visual: Thoughts groups have illustrated tiles in the same visual family as Today, and the header kicker is gone.
3. Persistence/handoff: drop updates positions, validations pass, localhost runs, implementation and changelog commits exist.
