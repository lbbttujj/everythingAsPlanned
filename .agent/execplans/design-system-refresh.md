# Design system refresh

## Purpose / Big Picture

The planner should feel like one calm, premium mobile product. Buttons, selects, switches, inputs, cards, dialogs, and navigation must share a consistent visual language, work with touch and keyboard, and support light and dark themes. The existing Today, Week, Thoughts, Goals, and sign-in flows must keep their behavior.

## Progress

- [x] 2026-09-30: Reviewed the existing screen and CSS; created `codex/testim-novyi-dizayn`.
- [x] 2026-09-30: Installed the MIT `frontend-design` skill locally.
- [x] Define semantic tokens and persistent theme control.
- [x] Restyle controls and primary product surfaces.
- [x] Verify mobile and desktop screens and interaction states.
- [x] Run typecheck, lint, build, and record outcomes.

## Surprises & Discoveries

- `app/globals.css` begins with a dark palette but overrides it around line 3506 with a light visual system; many later controls still use hard-coded pale backgrounds and small touch targets.
- The browser is already signed in locally, so rendered Today and other product screens can be inspected without creating test data.
- The repository's `.agents` directory denies sandbox writes; adding the third-party license requires the approved file-download path.
- The Week header actions initially overlapped the account controls at a narrow width; stacking them below the heading resolves the clash.
- At 320 px the Week day header caused document-wide horizontal scrolling. Letting its label wrap and constraining grid min-width removed the overflow without clipping controls.
- The previous light-theme `score-pill` foreground had weak contrast; the semantic accent now drives it in both themes.

## Decision Log

- Decision: Keep the current Next.js and plain CSS stack. Rationale: A visual system layer can unify existing components without replacing functional UI or adding a component dependency. Date/Author: 2026-09-30, Codex.
- Decision: Use semantic CSS custom properties with dark as the initial theme and an explicit light/dark toggle saved per browser. Rationale: Dark was requested, while the existing light look remains available. Date/Author: 2026-09-30, Codex.
- Decision: Put the downloaded MIT skill in `.agents/skills/frontend-design`. Rationale: It remains local to and versionable with this project. Date/Author: 2026-09-30, Codex.

## Outcomes & Retrospective

The local skill, design tokens, persistent dark/light switch, responsive control treatment, and documentation are in the test branch. Browser checks covered Today, Week, month overview, Thoughts (personal and shared), Goals, and the goal and task dialogs without altering records. Widths 320, 390, about 490, and 1280 px were inspected; the temporary viewport override was reset. Theme persistence and existing Supabase session restoration were checked by reload. Sign-in visuals were reviewed in code but not opened because that would require signing out of the user's active session. `npm run typecheck`, `npm run lint`, and `npm run build` passed. The sandboxed build and dev launch encountered Windows `spawn EPERM`; both passed with approved escalation. The local dev server is running again on port 3000. No production deployment or remote push is part of this experiment.

## Context and Orientation

`app/layout.tsx` imports `app/globals.css`. Client UI lives in `components/`; `Dashboard` owns the four sections and `AuthGate` owns sign-in. `lib/` holds domain types and Supabase persistence; user records are in Supabase, not in LocalStorage. LocalStorage may store only the visual theme. `docs/` holds product and database decisions. `.agents/skills/frontend-design` is the installed instruction set.

## Plan of Work

Add a semantic theme and component layer to `app/` and import it after `globals.css`. Add one small theme control component and render it in `components/dashboard.tsx` and `components/auth-gate.tsx`. Tune reusable visual selectors for buttons, selects, switches, cards, modal sheets, tabs, week calendar, thoughts, and goals. Preserve form state, event handlers, data storage, and navigation. Use the current browser view to assess mobile and desktop, then correct any clipping, contrast, or focus defects.

## Concrete Steps

From `F:\planner`, inspect current selectors with `rg`, edit with `apply_patch`, and run `npm run typecheck`, `npm run lint`, and `npm run build`. If Next cannot spawn inside the sandbox, rerun the build with approved escalation. Check `git diff --check` and leave the branch uncommitted for review unless asked.

## Validation and Acceptance

The Today, Week, Thoughts, Goals, and sign-in layouts should remain readable at phone and desktop widths. All main controls have visible focus, disabled, hover, and pressed states where relevant; touch actions meet a comfortable target size. Theme choice survives reload. Opening and closing an add dialog preserves the existing bottom-sheet motion. Typecheck, lint, and build pass. Existing user data is not modified by visual verification.

## Idempotence and Recovery

The design is isolated on a test branch. Theme preference uses a new browser-local key and is safe to clear. The UI layer can be removed without changing database schema or planner records. Do not reset or delete existing work; if visual changes regress behavior, revert only the relevant selectors/components on this branch.

## Interfaces and Dependencies

No package or database dependency is added. The theme attribute is `document.documentElement.dataset.theme`, with values `dark` and `light`. The saved key is `planner.theme.v1`. CSS components consume semantic tokens from the new design layer. Existing `Dashboard`, `AuthGate`, and form props stay intact.
