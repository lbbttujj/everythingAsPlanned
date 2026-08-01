# Codex Execution Plans (ExecPlans)

An ExecPlan is a living design document for a complex feature or significant refactor. It must let a contributor who knows only the current working tree and this file implement a complete, observable result. Use an ExecPlan when the work spans multiple milestones, has meaningful design uncertainty, changes several modules, or needs a migration. Do not use one for a small isolated fix.

## How to Use This File

When authoring an ExecPlan, read this file completely and follow its structure. The plan is the source of truth during implementation, not a disposable checklist. Update it after discoveries, decisions, completed milestones, and before stopping work. Resolve routine ambiguities in the plan and continue to the next milestone instead of asking the user for routine next steps.

An ExecPlan stored as a Markdown file must contain the plan directly; do not wrap the whole file in a second Markdown code fence. Define unfamiliar terms in plain language. Name repository-relative files, functions, commands, expected output, and visible behavior explicitly. Do not rely on external documentation or unstated conversation context.

## Non-Negotiable Requirements

- Explain the user-visible purpose before implementation details.
- Make the plan self-contained and sufficient for a novice contributor.
- Describe behavior that can be demonstrated, not only code structure.
- Include exact validation commands and how to interpret their results.
- Prefer safe, repeatable, additive steps; describe migration and recovery paths.
- Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` current.
- Record why a decision changed, not only what changed.

## Required Plan Structure

Use the following sections in every plan. Additional sections are allowed when they clarify the work.

### Purpose / Big Picture

State what the user can do after the change that they cannot do before, why it matters, and how a human will see it working.

### Progress

Use a checkbox list for granular work. Include timestamps at meaningful stopping points and describe partial work honestly.

- [ ] Example incomplete milestone.
- [x] Example completed milestone (YYYY-MM-DD HH:MM TZ).

### Surprises & Discoveries

Record unexpected behavior, bugs, performance findings, or constraints with short evidence such as a command result, error, or reproduction.

### Decision Log

Record decisions in this format:

- Decision: describe the choice.
  Rationale: explain the user or technical reason.
  Date/Author: record when and who decided.

### Outcomes & Retrospective

At each major milestone and at completion, summarize what works, what remains, what differed from the initial plan, and what was learned.

### Context and Orientation

Describe the current repository state as if the reader has no prior context. For this repository, orient the reader around `app/`, `components/`, `lib/`, `docs/`, `package.json`, and `LocalStorage`. Define any domain or technical term the plan uses.

### Plan of Work

Describe the implementation sequence in prose. For every edit, name the full repository-relative path and the relevant component, function, type, or module. Explain how the pieces connect and why the order reduces risk.

### Concrete Steps

Give exact commands and working directories. Include short expected transcripts when they prove progress. Keep steps idempotent where possible. Mention alternatives when an environment limitation changes how a command must run.

### Validation and Acceptance

Describe type checking, linting, builds, tests, and manual behavior checks appropriate to the change. Phrase acceptance as observable behavior, for example: after `npm start`, opening `http://localhost:3000/` shows the new flow and saving an item still works after reload.

### Idempotence and Recovery

Explain how to repeat each safe step. For migrations or destructive operations, state what is backed up, how old data is preserved, and how to recover from a partial failure. Never assume a reset or deletion is harmless.

### Interfaces and Dependencies

List the final public or internal interfaces that matter: TypeScript types, component props, storage keys, routes, commands, and external dependencies. Specify stable names and expected data shapes so another contributor can implement against them without guessing.

## Milestones

Milestones are independently verifiable stories, not decorative headings. Each milestone should state its goal, the files or modules involved, the resulting behavior, the command used to validate it, and the acceptance a human should observe. Prototypes are encouraged when they reduce uncertainty; label them as prototypes, keep them additive, and define the criteria for keeping or removing them.

## Living-Document Rule

When implementation changes direction, update `Progress`, `Surprises & Discoveries`, and `Decision Log` in the same edit. At completion, update `Outcomes & Retrospective` and record the final validation evidence. A future contributor must be able to restart from the current plan alone, without needing the original conversation.
