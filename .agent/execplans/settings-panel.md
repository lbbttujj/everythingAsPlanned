# Settings panel and friend contacts

## Purpose / Big Picture

The signed-in planner should show only a gear in its upper-right corner. Clicking it opens a smooth, accessible settings drawer with theme choice, current account information, saved friends, and sign-out. Friends remain selectable when inviting someone to a shared list; no database migration or existing records change.

## Progress

- [x] 2026-09-30: Located header controls, shared-list friend form, and existing friend repository functions.
- [x] 2026-09-30: Extracted focused friend-contacts loading and threaded a refresh revision into shared lists.
- [x] 2026-09-30: Built the sliding drawer and moved theme, friends, and sign-out into it.
- [x] 2026-09-30: Verified 320/490/1280 px layouts, keyboard/backdrop dismissal, theme persistence, existing friend loading and invitation selection; typecheck, lint, build passed.

## Surprises & Discoveries

- `SharedListsBoard` stores friend state only while the shared-list screen is mounted, and its existing panel shows an add form but not the saved list.
- Friend contacts already have owner-scoped RLS and create/remove RPCs; no schema work is needed.
- The current design experiment has uncommitted files on `codex/testim-novyi-dizayn`; preserve them.
- The selected shared list had a pending invitation to the only saved friend, so its dropdown correctly disabled that contact. A different owned list displayed the friend as an available invitation option.

## Decision Log

- Decision: Use a right-side drawer on both desktop and mobile, with a dimmed backdrop, slide-in/out transitions, Escape and backdrop dismissal, and keyboard focus restoration. Rationale: One consistent entry point avoids adding another bottom-navigation item. Date/Author: 2026-09-30, Codex.
- Decision: Keep the existing invitation dropdown in shared lists, but manage saved contacts only in settings. Rationale: Invitations stay contextual while the personal address book has one home. Date/Author: 2026-09-30, Codex.

## Outcomes & Retrospective

The header now has one gear. The drawer opens and closes smoothly, traps keyboard focus, restores it to the gear, and works at phone and desktop widths without horizontal overflow. It shows the saved theme, current account, future account-management area, personal friend contacts, and sign-out. The existing invitation flow still reads saved contacts; no schema or package change was needed. Browser checks did not create or delete any user records. `npm run typecheck`, `npm run lint`, and `npm run build` passed. The development server was restarted at `http://localhost:3000/`; the signed-in page loaded with no browser console errors. Changes remain uncommitted on the existing design test branch.

## Context and Orientation

`app/` contains the Next.js entry and CSS. `components/dashboard.tsx` renders signed-in navigation and the current header controls; `components/shared-lists-board.tsx` owns shared lists and invitations. `lib/shared-list-repository.ts` calls Supabase and maps `friend_contacts` records to `FriendContact` from `lib/types.ts`. `docs/` documents decisions. LocalStorage keeps only the theme preference; contacts remain in Supabase.

## Plan of Work

Add a focused `loadFriendContacts` repository function and reuse it in shared-list loading. Build `components/settings-panel.tsx` to load, add, and remove friends and to contain `ThemeToggle`, account placeholder, and sign-out. Replace the signed-in header controls with a gear in `Dashboard`; pass a contact revision to `BacklogBoard` and `SharedListsBoard` so the invite dropdown refreshes after friend changes. Remove the old friend add panel from shared-list membership UI. Add token-driven drawer styles to `app/design-system.css` and update `docs/design-system.md`.

## Concrete Steps

From `F:\planner`, patch the repository and components, then run `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check`. Use the already running local app at `http://localhost:3000/` for visual and keyboard checks. If Windows sandboxing causes `spawn EPERM`, use the approved build path; do not reset `.next` while the dev server uses it.

## Validation and Acceptance

At phone and desktop sizes the header shows one gear, not separate theme or exit buttons. The drawer animates from the right, closes by close button, Escape, and backdrop, and traps focus while open. Theme choice persists after reload. Settings list only the signed-in user's contacts; adding/removing updates the list and the shared-list invitation dropdown without a page reload. Account space shows the current email and a clear future-management placeholder. Sign-out works from settings. `typecheck`, `lint`, and production build pass.

## Idempotence and Recovery

All UI edits are reversible on the test branch. No schema or record migration is needed. Do not delete user contacts during manual verification. Test add/remove only with disposable data or verify code paths without mutating existing contacts.

## Interfaces and Dependencies

`SettingsPanel` receives `userId`, `email`, `onClose`, `onFriendsChange`, and `onSignOut`. `loadFriendContacts(userId)` returns `FriendContact[]`. `friendsRevision` is an in-memory Dashboard counter passed to the shared-list screen. No new package or persistence key is introduced.
