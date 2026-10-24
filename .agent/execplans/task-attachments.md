# Multiple task attachments and compact filenames

## Purpose / Big Picture

Tasks can hold multiple files selected together or added in batches. Long filenames must not widen the task form or lists. A paperclip with a count opens an attachment list on task cards in Today (including Review and Done) and Week. Images open in a full-screen viewer; other files download with their original filename. Existing attachments stay available during editing. Users can create a task directly from an expanded Today group, including an empty group, with its category fixed in the form.

## Progress

- [x] Inspect attachment schema, repository, task form and lists (2026-10-24 MSK).
- [x] Implement multiple selection, compact filenames, and attachment list/viewer/download (2026-10-24 MSK).
- [x] Add in-group creation with a locked category and make empty user groups visible (2026-10-24 MSK).
- [x] Verify existing attachment read, local multi-selection/removal, and update current documentation (2026-10-24 MSK).
- [x] Complete lint, production build, typecheck, and diff check (2026-10-24 MSK).
- [x] Restore localhost on port 3000 and verify the uncategorized group add form (2026-10-24 MSK).
- [x] Commit implementation as `8f44d93` and record its hash in CHANGELOG (2026-10-24 MSK).

## Surprises & Discoveries

- `Attachment[]` and the existing attachments table already support many attachments per task. No migration is needed.
- `ActionForm` currently retains only the first selected file; its flex label contains an unbroken filename and can overflow.
- Uploads are already sequential, but validate sizes inside the loop, permitting partial batches. Add batch validation and cleanup on failure.
- A recurring-series edit creates new IDs then tries to attach to the deleted old task ID. Select the actual replacement ID before uploading.
- Existing preview code in goals/thoughts only reads the first file and uses signed URL + a cross-origin download attribute. Keep those unrelated screens as they are; task downloads should use an authenticated Blob.
- Supabase changelog markdown could not be opened by the web fetcher; an elevated terminal fetch succeeded. Official Storage reference snippets were obtained through Supabase search_docs and Context7.
- Native `summary` exposes a generic accessible role in browser automation, so identify it by its accessible label. The private photo on an existing task opened successfully in the local UI.

## Decision Log

- Decision: Keep the existing private bucket, ownership checks, 6 MiB per-file limit, and Attachment model.
  Rationale: Multiple attachments already fit the data model; no new access grants are necessary.
  Date/Author: 2026-10-24 / Codex.
- Decision: Add files cumulatively, deduplicate exact file selections by name/size/type/lastModified, and allow removing unsaved picks. Saved attachments are retained.
  Rationale: User requested multiple uploads; deleting already-saved files is a separate feature.
  Date/Author: 2026-10-24 / Codex.
- Decision: Clip display labels, never stored names. Use an accessible disclosure list (not application-menu keyboard semantics) and a native dialog image viewer portaled to document.body.
  Rationale: Preserves original download names and avoids clipping inside animated group containers.
  Date/Author: 2026-10-24 / Codex.
- Decision: Show all user categories, including empty ones, as group tiles; keep the uncategorized tile only while it contains tasks. A group add action fixes its category until success/cancel, and ordinary add/edit retains category selection.
  Rationale: Users need a way to add the first task from a group without an irrelevant category picker.
  Date/Author: 2026-10-24 / Codex.

## Outcomes & Retrospective

Implementation committed as `8f44d93`; the journal entry records that hash. The browser check confirmed that a group with zero tasks expands and opens a form with its name and no category select; the uncategorized group behaves likewise; a long task title remains inside its card; an existing attachment list opens and its image appears in the native viewer. Two harmless local files were selected simultaneously, one was removed, then the dialog was cancelled. No new files or tasks were uploaded and live user records were not mutated. Lint, production build, typecheck, and `git diff --check` passed. Localhost restarted successfully. Physical mobile preview/download and live multi-upload remain untested.

## Context and Orientation

`components/action-form.tsx` selects local File objects; Dashboard saves the task then calls `uploadActionAttachments`. `lib/planner-repository.ts` uploads Storage objects and metadata, then `loadPlannerData` hydrates Attachment arrays. `components/today-list.tsx` and `components/week-calendar.tsx` render task cards. `app/design-system.css` overrides legacy global CSS. `docs/` documents behavior and storage; LocalStorage is not used for attachments. Dependencies are declared in package.json; Supabase JS is already installed.

## Plan of Work

Add attachment formatting/validation and authenticated download helpers in lib. Add reusable PaperclipIcon, TaskAttachmentPicker, TaskAttachments components. Keep upload and fetch operations in lib rather than UI components. Integrate the picker into ActionForm and the saved-file disclosure into all task-card render paths. Add constrained grid/flex labels and two-line task title truncation with full titles available through editing/title text. Make upload batch handling explicit and prevent duplicate submit while saving. Expose all user categories through TodayList and pass a locked group ID into Dashboard and ActionForm for in-group creation. Update specifications and journal.

## Concrete Steps

Work in F:\planner. Run `npm run lint` and `npm run typecheck`, inspect browser at narrow and wide widths. Stop managed dev before `npm run build`, then typecheck and restart `npm run dev`. Verify multi-file picker with synthetic files and confirm Storage schema through read-only queries if available. Record any unavailable live upload test rather than claiming it passed.

## Validation and Acceptance

- Select multiple files, add another batch, remove an unsaved pick, and reselect the same file without overflow.
- A long Unicode filename stays within the 320 px form; original name remains available.
- Saved attachments are listed while editing and preserved when adding new files.
- Paperclip appears only when files exist; all files are listed. Click-outside/Escape close the disclosure and the image viewer restores focus.
- Image loads or shows an actionable error. Other files download as original filename; loading and errors are visible.
- Today, Review, Done, and Week show the same attachment UI. Task title clamping does not mutate data.
- Empty user groups remain visible. Adding from any expanded group shows its name instead of the selector and saves that category; the general add/edit flows keep their selector.
- Validate batch size before saving; a failed batch cleans up only newly-created objects. No credentials or public links are stored.
- Lint, build, typecheck, diff-check pass; localhost runs at handoff. Commit and journal update follow AGENTS.md.

## Idempotence and Recovery

No schema migration or public access changes. Existing records/files remain untouched. Upload cleanup only targets IDs/paths created by that upload call. Preserve user work and avoid resets. Test with non-sensitive fixtures; document any remaining physical-device/live-storage validation.

## Interfaces and Dependencies

ActionForm gains `existingAttachments?: Attachment[]`, `isSaving?: boolean`, `isCategoryLocked?: boolean`, and `lockedCategoryTitle?: string`. TodayList `onAdd(categoryId?: string)` passes group context. Attachment remains `{ id, storagePath, fileName, mimeType, sizeBytes, createdAt }`. New components accept Attachment arrays or File arrays, not database clients. Blob URLs are revoked when no longer needed. No new runtime packages.

## Milestones

1. Picker and data flow: several selected files upload safely and existing attachments remain visible.
2. Card interaction: paperclip lists files, previews images, downloads other formats; narrow layouts are stable.
3. Verification/documentation: relevant checks and browser evidence, implementation commit, real hash in changelog. Lint/build/typecheck and existing-image preview passed; live uploads were intentionally not performed against user data.
