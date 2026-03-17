---
name: ""
overview: ""
todos: []
isProject: false
---

# Priority 2: TanStack Form Migration -- Scoresheet Dialogs and Group Selectors

## Overview

Priority 2 covers **10 forms** split into two batches: the 8 match scoresheet dialog forms and the 2 group player selector forms. These are moderately complex, moderately used forms. Migrating them in batches by domain keeps changes cohesive and testable.

## Prerequisites

- Priority 1 must be complete (establishes `FileField`, verifies `SwitchField`/`SelectField` accept `disabled`)
- The `FileField` component from Priority 1 is needed for `match-images.tsx`

## Dependencies

- Scoresheet dialogs (Batch A) are independent of group selectors (Batch B) -- batches can be done in any order
- Within Batch A, forms are independent of each other

---

## Batch A: Scoresheet Dialogs (8 forms)

### Migration Order

Migrate simpler forms first to build up confidence, then tackle the complex ones:

1. CommentDialog (simplest -- 1 field)
2. DetailDialog (1 field, polymorphic submission)
3. add-round-dialog (4 fields, standard)
4. edit-player-dialog (2 fields + role checkbox array)
5. edit-team-dialog (3 fields + nested arrays)
6. ManualWinnerDialog (array checkbox multi-select)
7. TieBreakerDialog (array with placement editing)
8. match-images (file upload)

---

### Form 1: Comment Dialog

- **File**: `apps/nextjs/src/components/match/scoresheet/CommentDialog.tsx`
- **Lines**: 121
- **Complexity**: Low

#### Current Implementation

- **Schema**: `z.object({ comment: z.string() })`
- **Fields**: `comment` (textarea)
- **Submission**: `updateMatchCommentMutation.mutate({ match, comment })` via `useUpdateMatchCommentMutation`

#### Migration Notes

- Replace `useForm` with `useAppForm`
- `comment` field: `<form.AppField name="comment">{(field) => <field.TextAreaField label="Comment" />}</form.AppField>`
- Move mutation call into `useAppForm`'s `onSubmit`
- Replace `<Form {...form}>` / `<FormField>` wrappers
- Simplest migration -- good starting point for the batch

---

### Form 2: Detail Dialog

- **File**: `apps/nextjs/src/components/match/scoresheet/DetailDialog.tsx`
- **Lines**: 160
- **Complexity**: Low

#### Current Implementation

- **Schema**: `z.object({ detail: z.string() })`
- **Fields**: `detail` (textarea)
- **Submission**: `updateMatchDetailsMutation.mutate(...)` -- branches on `data.type === "player"` vs `"team"` for different payload shapes

#### Migration Notes

- Same pattern as CommentDialog
- `detail` field: `<form.AppField name="detail">{(field) => <field.TextAreaField label="Detail" />}</form.AppField>`
- The polymorphic submission (player vs team payload) stays in the `onSubmit` handler

---

### Form 3: Add Round Dialog

- **File**: `apps/nextjs/src/components/match/scoresheet/add-round-dialog.tsx`
- **Lines**: 243
- **Complexity**: Medium

#### Current Implementation

- **Schema**: `insertRoundSchema.pick({ name, type, color, score })` from `@board-games/db/zodSchema`
- **Fields**: `name` (text), `type` (select -- round type enum), `color` (gradient picker), `score` (number, conditional on type)
- **Submission**: `addRound.mutate(...)` via tRPC, invalidates queries, captures PostHog event

#### Migration Notes

- `name`: `<form.AppField name="name">{(field) => <field.TextField label="Name" />}</form.AppField>`
- `type`: `<form.AppField name="type">{(field) => <field.SelectField label="Type" options={roundTypes} />}</form.AppField>`
- `color`: Custom field -- use `form.Field` with inline render wrapping `GradientPicker` since there's no registered color picker component
- `score`: Conditional render -- use `form.Field` with inline render that checks the current type value. Use `form.useStore(s => s.values.type)` to reactively show/hide the score field when `type === "Checkbox"`
- Replace `form.watch("type")` with `form.useStore(s => s.values.type)`

---

### Form 4: Edit Player Dialog (Scoresheet)

- **File**: `apps/nextjs/src/components/match/scoresheet/edit-player-dialog.tsx`
- **Lines**: 402
- **Complexity**: Medium-High

#### Current Implementation

- **Schema**: `z.object({ team: z.number().nullable(), roles: z.array(discriminatedUnion(...)) })`
- **Fields**: `team` (select, nullable), `roles` (checkbox multi-select array)
- **Submission**: `updateMatchPlayerTeamAndRolesMutation.mutate(...)` -- computes `rolesToAdd`/`rolesToRemove` diffs
- **Watches**: `form.watch("team")` and `form.watch("roles")` for reactive role/team cascading

#### Migration Notes

- `team` field: use `form.Field` with inline render wrapping the existing team `<Select>` (nullable number, not a standard string select)
- `roles` field: use `form.Field` with inline render for checkbox multi-select (same pattern as Priority 1 Form 1)
- Replace `form.watch("team")` with `form.useStore(s => s.values.team)` for cascading role updates when team changes
- Replace `form.watch("roles")` with `form.useStore(s => s.values.roles)`
- Replace `form.setValue("roles", newRoles)` with `form.setFieldValue("roles", newRoles)`
- The role diff computation in `onSubmit` stays the same

---

### Form 5: Edit Team Dialog (Scoresheet)

- **File**: `apps/nextjs/src/components/match/scoresheet/edit-team-dialog.tsx`
- **Lines**: 577
- **Complexity**: High

#### Current Implementation

- **Schema**: Dynamic -- `originalMatchFormSchema` or `sharedMatchFormSchema` based on `matchInput.type`. Has `name` (string), `roles` (discriminated union array), `players` (array of objects with nested roles)
- **Fields**: `name` (text), `roles` (checkbox array), `players` (array with add/remove and nested role arrays)
- **Submission**: `updateMatchTeamMutation.mutate(...)` -- computes `playersToAdd`, `playersToRemove`, `playersToUpdate` with role diffs

#### Migration Notes

- Replace `useForm` with `useAppForm`
- `name`: `<form.AppField name="name">{(field) => <field.TextField label="Team Name" />}</form.AppField>`
- `roles`: `form.Field` with inline render for checkbox multi-select
- `players`: `form.Field name="players" mode="array"` for the player list with add/remove
  - Nested `form.Field name={\`players[${index}].roles}` for per-player roles
- Replace `form.setValue("players", [...])` with `form.setFieldValue("players", [...])`
- The dynamic schema selection (original vs shared) passes directly to `validators: { onSubmit: dynamicSchema }`
- This is the most complex form in this batch -- test thoroughly

---

### Form 6: Manual Winner Dialog

- **File**: `apps/nextjs/src/components/match/scoresheet/ManualWinnerDialog.tsx`
- **Lines**: 330
- **Complexity**: Medium

#### Current Implementation

- **Schema**: `z.object({ players: z.array(playerSchema) })` with conditional `.min(1)` for non-coop
- **Fields**: `players` -- array built by multi-select checkbox toggling
- **Submission**: `updateMatchManualWinnerMutation.mutate(...)` then navigates to finished match

#### Migration Notes

- Replace `useForm` with `useAppForm`
- `players` field: `form.Field` with inline render. The array is built by toggling players in/out via checkbox clicks (not `useFieldArray` -- values are set directly)
- The conditional schema (`.min(1)` only when `!scoresheet.isCoop`) is computed before passing to `validators.onSubmit`
- "Clear" button: `form.setFieldValue("players", [])`
- "Select All" button: `form.setFieldValue("players", allPlayers)`
- Replace `form.setValue("players", [...])` calls

---

### Form 7: Tie Breaker Dialog

- **File**: `apps/nextjs/src/components/match/scoresheet/TieBreakerDialog.tsx`
- **Lines**: 421
- **Complexity**: Medium-High

#### Current Implementation

- **Schema**: `z.object({ players: TieBreakerPlayerSchema })` -- array of `{ matchPlayerId, name, image, score, placement, teamId }`
- **Fields**: `players` array via `useFieldArray` with custom `update` for placement editing
- **Submission**: `updateMatchPlacementsMutation.mutate(...)` then navigates

#### Migration Notes

- Replace `useFieldArray` with `form.Field name="players" mode="array"`
- Replace `update(index, newPlayer)` with `field.replaceValue(index, newPlayer)` for placement changes
- Each player's placement is edited via a `Popover` with number input -- use nested `form.Field name={\`players[${index}].placement}`or handle inline via`field.replaceValue`
- Team deduplication logic (`uniqueInOrderPlacements`) stays the same -- it's a display concern
- Tie highlighting (`bg-destructive/50`) stays the same

---

### Form 8: Match Images

- **File**: `apps/nextjs/src/components/match/scoresheet/match-images.tsx`
- **Lines**: 425
- **Complexity**: Medium

#### Current Implementation

- **Schema**: `z.object({ caption: z.string().optional(), file: nonNullFileSchema })`
- **Fields**: `caption` (text, optional), `file` (file input, required)
- **Submission**: Upload via `startUpload` (UploadThing), then invalidates query
- **File upload**: `useUploadThing` with image preview

#### Migration Notes

- Only the `AddImageDialogContent` sub-component has a form -- the carousel/view/delete parts stay unchanged
- Replace `useForm` with `useAppForm`
- `caption`: `<form.AppField name="caption">{(field) => <field.TextField label="Caption" />}</form.AppField>`
- `file`: Use the `FileField` registered component (from Priority 1) via `<form.AppField name="file">{(field) => <field.FileField label="Image" required />}</form.AppField>` -- or `form.Field` with inline render if the component doesn't fit
- Move upload logic into `useAppForm`'s `onSubmit`

---

## Batch B: Group Player Selection Entry Points

### Form 9: Shared Players Table (used by Add/Edit Group flows)

- **File**: `apps/nextjs/src/app/dashboard/players/_components/players.tsx`
- **Used by**:
  - `apps/nextjs/src/app/dashboard/groups/add/players/page.tsx`
  - `apps/nextjs/src/app/dashboard/groups/[id]/edit/players/page.tsx`
- **Complexity**: Medium

#### Current Implementation

- Shared `PlayersTable` component powers both add/edit group player flows.
- Add flow reads selected players from group add store and navigates back.
- Edit flow is group-scoped via route param and `PlayersTable` filtering.

#### Migration Notes

- Replace any remaining `useForm` usage in group player selection entry points with `useAppForm`.
- Move store writes like `setPlayers(...)` into `useAppForm` `onSubmit` handlers.
- Replace any `form.setValue("players", [...])` calls with `form.setFieldValue("players", [...])`.
- Keep group add/edit routes using the shared `PlayersTable` so selection logic stays centralized.

---

## Shared Cleanup After Priority 2

After all 10 forms are migrated:

- Run `pnpm turbo run lint typecheck --filter=@board-games/nextjs`
- Test the entire match scoresheet flow (add round, edit player/team, tie breaker, manual winner, comments, details, images)
- Test group player selection (add and edit flows)
- Look for opportunities to extract shared patterns:
  - Checkbox multi-select array field (used in scoresheet and group selector forms)

## Before vs After Playwright Comparison

Use these tests as Priority 2 regression gates and compare baseline (before migration) to post-migration behavior:

- `tooling/playwright-web/src/match/match-scoresheet.dialogs.basic.spec.ts`
- `tooling/playwright-web/src/match/match-scoresheet.edit-player-team.spec.ts`
- `tooling/playwright-web/src/match/match-scoresheet.winner-tiebreaker.spec.ts`
- `tooling/playwright-web/src/group/group-player-selection.spec.ts`

Execution method:

- Use Playwright MCP flows for validation runs and artifact capture.
- Do not run Playwright via shell commands for this Priority 2 verification.

Run sequence:

1. Capture a baseline run before migration for the four specs.
2. Migrate Priority 2 forms.
3. Re-run the same four specs after migration.
4. Compare outcomes and artifacts.

Pass criteria:

- All four specs pass in the post-migration run.
- No new failures or flaky regressions are introduced in these flows.
- Functional behavior stays equivalent before and after migration for:
  - scoresheet comment/detail/edit dialogs
  - manual winner and tie-breaker finish paths
  - group add/edit player selection and add/remove diff behavior

## Playwright Screenshots

Capture deterministic screenshots in both baseline and post-migration runs for direct visual comparison.

Capture method:

- Use Playwright MCP screenshot capture during the before/after verification flow.
- Do not generate screenshots by invoking Playwright CLI commands from the terminal.

Naming convention:

- `before-<spec-key>-<checkpoint>.png`
- `after-<spec-key>-<checkpoint>.png`

Store under a stable artifact directory (for example `tooling/playwright-web/artifacts/priority-2/`) so screenshots can be diffed by filename pair.

Required checkpoints:

- `dialogs-basic`:
  - comment dialog open with edited text
  - player/team detail dialog open after value entry
  - add-round dialog after selecting `Checkbox` type
- `edit-player-team`:
  - edit-player dialog with team assignment selection visible
  - edit-team dialog showing player removed/added state before save
  - reopened edit-team dialog showing persisted players after save
- `winner-tiebreaker`:
  - manual winner dialog with selections made before confirm
  - tie-breaker dialog with placement editor open
- `group-player-selection`:
  - group add player selector with selected pills visible
  - group edit player selector showing remove/add diff state

Screenshot criteria:

- Same viewport, theme, and browser mode for before/after captures.
- Use the same checkpoint names in both runs.
- Keep screenshots tied to assertions already covered by the four specs.

## Exit Criteria

- Plan contains zero references to out-of-scope share/share-request forms for Priority 2.
- Plan explicitly names the four new Playwright specs as migration regression gates.
- Before/after runs are compared for pass/fail parity and behavior parity in targeted flows.
- Before/after screenshot artifacts are captured with matching checkpoint names and diffable filenames.
- Verification and screenshots are executed through Playwright MCP (not shell Playwright commands).
