---
name: ""
overview: ""
todos: []
isProject: false
---

# Priority 2: TanStack Form Migration -- Scoresheet Dialogs, Sharing Flows, Group Selectors

## Overview

Priority 2 covers **15 forms** split into three batches: the 8 match scoresheet dialog forms, the 5 sharing/share-request forms, and the 2 group player selector forms. These are moderately complex, moderately used forms. Migrating them in batches by domain keeps changes cohesive and testable.

## Prerequisites

- Priority 1 must be complete (establishes `FileField`, verifies `SwitchField`/`SelectField` accept `disabled`)
- The `FileField` component from Priority 1 is needed for `match-images.tsx`

## Dependencies

- Scoresheet dialogs (Batch A) are independent of sharing forms (Batch B) and group selectors (Batch C) -- batches can be done in any order
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

## Batch B: Sharing Flows (5 forms)

These forms share very similar patterns (friend multi-select, permission selection, tabs for share method). Consider extracting shared patterns after migration.

### Migration Order

1. share-game (largest, establishes the pattern)
2. share-player (near-duplicate of share-game)
3. game-request (simpler accept/reject)
4. player-request (most complex share request)
5. match-request (complex, similar to game-request)

---

### Form 9: Share Game

- **File**: `apps/nextjs/src/app/dashboard/games/[id]/share/_components/share-game.tsx`
- **Lines**: 1003
- **Complexity**: Very High

#### Current Implementation

- **Schema**: Complex `z.object({ shareMethod, friendIds, permission, linkExpiry, matchIds, scoresheetIds }).check(...)`
- **Fields**: `shareMethod` (radio), `friendIds` (multi-select combobox), `permission` (select), `linkExpiry` (select), `matchIds` (array of objects with nested `includePlayers` and `permission`), `scoresheetIds` (array of objects with `permission`)
- **Submission**: `trpc.sharing.requestShareGame` mutation, branches on share method
- **Watches**: `form.watch("shareMethod")`, `form.watch("matchIds")`, `form.watch("scoresheetIds")`

#### Migration Notes

- Replace `useForm` with `useAppForm`
- `shareMethod`: `form.Field` with inline render (radio group, not a standard select)
- `friendIds`: `form.Field` with inline render (Command + Popover combobox multi-select)
- `permission` / `linkExpiry`: `<form.AppField>{(field) => <field.SelectField ... />}</form.AppField>`
- `matchIds` and `scoresheetIds`: `form.Field mode="array"` for the arrays. Nested fields for per-item `includePlayers` and `permission`
- Replace all `form.watch(...)` calls with `form.useStore(s => s.values.x)`
- Replace `form.setValue("matchIds", [...])` with `form.setFieldValue("matchIds", [...])`
- The "Select All" checkbox logic for matches/scoresheets uses `form.setValue` -- update to `form.setFieldValue`
- This file is 1003 lines -- consider if it can be split into sub-components using `withForm` or `withFieldGroup`

---

### Form 10: Share Player

- **File**: `apps/nextjs/src/app/dashboard/players/[id]/share/_components/share-player.tsx`
- **Lines**: 844
- **Complexity**: High

#### Current Implementation

- Nearly identical to share-game but without `scoresheetIds`
- **Schema**: `z.object({ shareMethod, friendIds, permission, linkExpiry, matchIds }).check(...)`
- **Submission**: `trpc.sharing.requestSharePlayer` mutation

#### Migration Notes

- Same migration pattern as Form 9 (share-game)
- One fewer array field (no `scoresheetIds`)
- Consider extracting shared sharing form components after both Form 9 and 10 are migrated

---

### Form 11: Game Share Request

- **File**: `apps/nextjs/src/app/dashboard/share-requests/[id]/_componenets/game-request.tsx`
- **Lines**: 696
- **Complexity**: High

#### Current Implementation

- **Schema**: `z.object({ gameOption, existingGameId, scoresheets }).check(...)` requiring at least one accepted scoresheet
- **Fields**: `gameOption` (radio: "new"/"existing"), `existingGameId` (combobox search), `scoresheets` (array with accept boolean)
- **Submission**: `trpc.sharing.acceptGameShareRequest` mutation, merges with external state (`players`, `matches`, `locations`)
- **External state**: `useState` for `players`, `matches`, `locations` outside the form

#### Migration Notes

- Replace `useForm` with `useAppForm`
- `gameOption`: `form.Field` with inline render (RadioGroup)
- `existingGameId`: `form.Field` with inline render (Command + Popover combobox)
- `scoresheets`: `form.Field mode="array"` for the scoresheet accept/reject list
- The external `useState` for players/matches/locations stays external -- these are child component state, not form fields
- Replace `form.watch("gameOption")` with `form.useStore(s => s.values.gameOption)`
- Replace `form.setValue(...)` calls with `form.setFieldValue(...)`

---

### Form 12: Player Share Request

- **File**: `apps/nextjs/src/app/dashboard/share-requests/[id]/_componenets/player-request.tsx`
- **Lines**: 1421
- **Complexity**: Very High (most complex form in the app)

#### Current Implementation

- **Schema**: Deeply nested -- `z.object({ playerOption, existingPlayerId, games: z.array(union of sharedGameSchema | requesteeGameSchema) })`. Each game has `gameOption`, `existingGameId`, `accept`, `matches[].accept`, `scoresheets[].accept`
- **Fields**: `playerOption` (radio), `existingPlayerId` (combobox), `games` (deeply nested array with per-game options)
- **Submission**: `trpc.sharing.acceptPersonShareRequest` mutation
- **Array operations**: `useFieldArray` for `games.${gameIndex}.matches`

#### Migration Notes

- This file is **1421 lines** and exceeds the 500-line guideline. Consider splitting into sub-components with `withForm` during migration:
  - `PlayerRequestForm` (top-level with `useAppForm`)
  - `GameRequestItem` (per-game card, could be a `withForm` sub-form or just a component receiving form)
  - `MatchRequests` (per-game match list)
- Replace `useFieldArray` for matches with `form.Field name={\`games[${gameIndex}].matches} mode="array"`
- Replace all `form.watch(...)` and `form.setValue(...)` calls
- The external `useState` for `players`, `locations` stays external
- The deeply nested field paths like `games.${gameIndex}.scoresheets.${scoresheetIndex}.accept` become `games[${gameIndex}].scoresheets[${scoresheetIndex}].accept` in TanStack Form

---

### Form 13: Match Share Request

- **File**: `apps/nextjs/src/app/dashboard/share-requests/[id]/_componenets/match-request.tsx`
- **Lines**: 1101
- **Complexity**: Very High

#### Current Implementation

- **Schema**: `z.object({ gameOption, existingGameId, scoresheets }).check(...)`
- **Fields**: Same as game-request but with different context (match sharing)
- **Submission**: `trpc.sharing.acceptMatchShareRequest` mutation
- **Special**: Two entirely different renders based on whether `"sharedGame" in match` or `gameChildItem` exists

#### Migration Notes

- Same patterns as Form 11 (game-request)
- The two conditional render paths each potentially have their own form or a shared form with different fields visible
- Replace all RHF patterns as described
- This file is also over the 500-line guideline -- consider splitting during migration

---

## Batch C: Group Player Selectors (2 forms)

### Form 14: Select Players for Group Add

- **File**: `apps/nextjs/src/app/dashboard/groups/add/players/_components/selectPlayersForm.tsx`
- **Lines**: 177
- **Complexity**: Medium

#### Current Implementation

- **Schema**: `z.object({ players: z.array(insertPlayerSchema.pick({name, id}).required().extend({imageUrl, matches, team})).refine(players => players.length > 0) })`
- **Fields**: `players` -- array built by checkbox multi-select
- **Submission**: No API call -- sets Zustand store via `setPlayers(data.players)` and navigates back

#### Migration Notes

- Replace `useForm` with `useAppForm`
- `players` field: `form.Field` with inline render for checkbox toggle (players are added/removed from the array by clicking)
- The Zustand store interaction stays the same -- just move `setPlayers` call into `onSubmit`
- Replace `form.setValue("players", [...])` with `form.setFieldValue("players", [...])`

---

### Form 15: Select Players for Group Edit

- **File**: `apps/nextjs/src/app/dashboard/groups/[id]/edit/players/_components/selectPlayerForm.tsx`
- **Lines**: 205
- **Complexity**: Medium

#### Current Implementation

- **Schema**: `z.object({ players: z.array(insertPlayerSchema.pick({name, id}).required()).refine(players => players.length > 0) })`
- **Fields**: `players` -- checkbox multi-select array
- **Submission**: `trpc.group.updatePlayers` mutation with diff computation (playersToAdd/playersToRemove)

#### Migration Notes

- Same pattern as Form 14
- The diff computation in `onSubmit` stays the same
- Replace `form.setValue("players", [...])` with `form.setFieldValue("players", [...])`

---

## Shared Cleanup After Priority 2

After all 15 forms are migrated:

- Run `pnpm turbo run lint typecheck --filter=@board-games/nextjs`
- Test the entire match scoresheet flow (add round, edit player/team, tie breaker, manual winner, comments, details, images)
- Test all sharing flows (share game, share player, accept/reject share requests)
- Test group player selection (add and edit flows)
- Look for opportunities to extract shared patterns:
  - Checkbox multi-select array field (used in 6+ forms)
  - Friend/item combobox selector (used in sharing forms)
  - Permission select pattern (used in sharing forms)
