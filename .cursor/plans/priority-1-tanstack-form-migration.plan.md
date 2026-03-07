---
name: ""
overview: ""
todos: []
isProject: false
---

# Priority 1: TanStack Form Migration -- Core User Flows

## Overview

Priority 1 covers the **7 most complex, highest-traffic forms** in the app. These are the match player management system (used in every match creation/edit flow) and the dashboard player dialogs (the most common CRUD operation). Migrating these first maximizes consistency with the existing TanStack Form match/game forms and establishes reusable patterns (especially a `FileField` component) that downstream priorities depend on.

## Prerequisites

Before starting any form migration:

1. **Create a `FileField` registered field component** at `apps/nextjs/src/components/form/file-field.tsx`

- Value type: `File | null` (or `File | string | null` for edit forms that show existing URLs)
- Renders a file `<Input type="file" accept="image/*">` with image preview via `URL.createObjectURL`
- Cleans up object URLs in a `useEffect` return
- Follows the same `useFieldContext` / `Field` / `FieldLabel` / `FieldError` pattern as `TextField`
- Register it in `apps/nextjs/src/hooks/form.tsx` under `fieldComponents`
- Used by: forms 4, 5, 6 in this priority, plus Priority 2 (`match-images.tsx`) and Priority 3 (`uploadBGGdata.tsx`)

1. Verify the existing `SwitchField` and `SelectField` components cover the patterns needed for form 7 (friend settings). The friend settings form uses `Switch` and `Select` with `disabled` states -- ensure the registered field components accept a `disabled` prop.

## Migration Order

Migrate in this order due to dependencies:

1. **Player role** (`player-role.tsx`) -- standalone, no dependencies
2. **Team selector** (`team-selector.tsx`) -- standalone (contains 2 sub-forms)
3. **Match player selector** (`selector.tsx`) -- depends on pattern from 1 and 2
4. **Add player (match flow)** (`add-player.tsx`) -- needs `FileField`
5. **Add player dialog (dashboard)** (`addPlayerDialog.tsx`) -- same pattern as 4
6. **Edit player dialog** (`editPlayerDialog.tsx`) -- extends pattern from 5
7. **Friend settings** (`friend-settings-form.tsx`) -- standalone, uses `SwitchField` and `SelectField`

---

## Form 1: Player Role Management

- **File**: `apps/nextjs/src/components/match/players/player-role.tsx`
- **Lines**: 207
- **Complexity**: Medium

### Current Implementation

- **Schema**: `z.object({ roles: z.array(z.discriminatedUnion("type", [originalRoleSchema, sharedRoleSchema])) })`
- **Fields**: `roles` -- array of discriminated union objects, toggled via checkbox list
- **useForm**: `useForm({ schema: formSchema, defaultValues: { roles: player.roles } })` from `@board-games/ui/form`
- **Submission**: Calls `onSave(values.roles)` parent callback (no API call)
- **Watches**: `form.watch("roles")` for disabled-state logic on team-assigned roles

### Migration Notes

- Replace `useForm` from `@board-games/ui/form` with `useAppForm` from `~/hooks/form`
- The `roles` field is a **custom array field** (checkbox multi-select, not a standard input) -- use `form.Field` with inline render, not `form.AppField`
- Replace `form.watch("roles")` with `form.useStore(s => s.values.roles)`
- Replace `<Form {...form}>` wrapper -- remove it
- Replace `<FormField control={form.control} name="roles" render={...}>` with `<form.Field name="roles">{(field) => ...}</form.Field>`
- Inside the field render, replace `field.onChange(newRoles)` (RHF) with `field.handleChange(newRoles)` (TanStack)
- Replace `field.value` with `field.state.value`
- Replace `form.handleSubmit(onSubmit)` with `form.handleSubmit()`; move `onSave` logic into `useAppForm`'s `onSubmit`
- Replace manual submit button with `<form.AppForm><form.SubscribeButton label="Save" /></form.AppForm>` or inline `form.Subscribe`

---

## Form 2: Team Selector (2 sub-forms)

- **File**: `apps/nextjs/src/components/match/players/team-selector.tsx`
- **Lines**: 486
- **Complexity**: High

### Current Implementation -- ManageTeamContent (lines ~50-322)

- **Schema**: `z.object({ teams: z.array(z.object({ id, name, roles })) })`
- **Fields**: `teams` array via `useFieldArray` with `append`, `remove`, `update`
- **useForm**: `useForm({ schema: formSchema, defaultValues: { teams } })`
- **Submission**: Calls `setTeams(data.teams)` parent callback

### Current Implementation -- ManageTeamRoles (lines ~324-485)

- **Schema**: `z.object({ roles: z.array(discriminatedUnion(...)) })`
- **Fields**: `roles` array (directly manipulated via `field.onChange`)
- **useForm**: `useForm({ schema: formSchema, defaultValues: { roles: team.roles } })`
- **Submission**: Calls `onSave(values.roles)` parent callback

### Migration Notes

- Both sub-forms use `useAppForm` (not `withForm`, since they're independent forms in the same file)
- **ManageTeamContent**: Replace `useFieldArray` with `form.Field name="teams" mode="array"`. Inside the render:
  - Replace `fields.map((field, index) => ...)` with `field.state.value.map((team, index) => ...)`
  - Replace `append(newTeam)` with `field.pushValue(newTeam)`
  - Replace `remove(index)` with `field.removeValue(index)`
  - Replace `update(index, newTeam)` with `field.replaceValue(index, newTeam)`
  - For inline team name editing (`teams.${index}.name`), use a nested `form.Field` with `name={\`teams[${index}].name}`
- **ManageTeamRoles**: Same pattern as Form 1 (player-role) -- checkbox multi-select for roles array
- Replace all `form.watch(...)` calls with `form.useStore(s => s.values.x)`

---

## Form 3: Match Player Selector

- **File**: `apps/nextjs/src/components/match/players/selector.tsx`
- **Lines**: 609
- **Complexity**: High

### Current Implementation

- **Schema**: `z.object({ players: addMatchPlayersSchema, teams: z.array(z.object({ id, name, roles })) })`
- **Fields**: `players` array via `useFieldArray` (append, remove, update); `teams` array via `form.setValue`
- **useForm**: `useForm({ schema: AddPlayersFormSchema, defaultValues: { players: [...], teams } })`
- **Submission**: Calls `setPlayersAndTeams(data.players, data.teams)` parent callback

### Migration Notes

- Replace `useForm` with `useAppForm`; move `setPlayersAndTeams` call into `onSubmit`
- Replace `useFieldArray({ control: form.control, name: "players" })` with `form.Field name="players" mode="array"`:
  - `append(player)` becomes `field.pushValue(player)`
  - `remove(index)` becomes `field.removeValue(index)`
  - `update(index, player)` becomes `field.replaceValue(index, player)`
  - `fields` iteration becomes `field.state.value.map(...)`
- For `teams` (set via `form.setValue("teams", newTeams)`), use `form.setFieldValue("teams", newTeams)`
- The per-player team assignment `<Select>` uses `form.setValue(\`players.${index}.teamId, value)`-- replace with`form.setFieldValue(players[${index}].teamId, value)`
- Remove `<Form {...form}>` wrapper
- All conditional view switching (player list, AddPlayerForm, ManageTeamContent, ManagePlayerRoles) stays the same -- only the form wiring changes
- The `PlayerGroupSelector` child component receives `append` -- pass `field.pushValue` instead

---

## Form 4: Add Player (Match Flow)

- **File**: `apps/nextjs/src/components/match/players/add-player.tsx`
- **Lines**: 208
- **Complexity**: Medium

### Current Implementation

- **Schema**: `insertPlayerSchema.pick({ name: true }).extend({ imageUrl: fileSchema })`
- **Fields**: `name` (text input), `imageUrl` (file input with image preview)
- **useForm**: `useForm({ schema: addPlayerSchema, defaultValues: { name: "", imageUrl: null } })`
- **Submission**: Uploads image via `useUploadThing`, then calls `trpc.player.create` mutation, then `addMatchPlayer` callback
- **File upload**: `useUploadThing("imageUploader")` with `usageType: "player"`

### Migration Notes

- Replace `useForm` with `useAppForm`; move `onSubmit` logic (upload + mutate) into `useAppForm`'s `onSubmit`
- `name` field: use `<form.AppField name="name">{(field) => <field.TextField label="Name" />}</form.AppField>`
- `imageUrl` field: use the new `FileField` component via `<form.AppField name="imageUrl">{(field) => <field.FileField label="Image" />}</form.AppField>` -- or use `form.Field` with inline render if `FileField` doesn't cover the upload-then-mutate pattern
- The `useUploadThing` logic stays in the component (not in the field component) -- it's submission logic, not field rendering
- Replace `<Form {...form}>` and `<FormField>` wrappers
- Replace manual `isSubmitting` / `isUploading` state with `form.Subscribe selector={s => s.isSubmitting}` (the async `onSubmit` will naturally keep `isSubmitting` true during upload)
- Replace `form.reset()` with `form.reset()`
- Note: There is already a TanStack Form version at `components/match/add/add-player-form.tsx` using raw `useForm` from `@tanstack/react-form`. Consider whether this file (`match/players/add-player.tsx`) and that file serve distinct purposes or can be consolidated

---

## Form 5: Add Player Dialog (Dashboard)

- **File**: `apps/nextjs/src/app/dashboard/players/_components/addPlayerDialog.tsx`
- **Lines**: 232
- **Complexity**: Medium

### Current Implementation

- **Schema**: `insertPlayerSchema.pick({ name: true }).extend({ imageUrl: fileSchema })`
- **Fields**: `name` (text), `imageUrl` (file with preview) -- nearly identical to Form 4
- **useForm**: `useForm({ schema: playerSchema, defaultValues: { name: "", imageUrl: null } })`
- **Submission**: Upload via `useUploadThing`, then `trpc.player.create` mutation, invalidate queries, `router.refresh()`, close dialog
- **File upload**: Same `useUploadThing("imageUploader")` pattern

### Migration Notes

- Nearly identical migration to Form 4
- Replace `useForm` with `useAppForm`
- Use `FileField` for `imageUrl` or `form.Field` with inline render
- Move `onSubmit` (upload + mutate + invalidate + refresh) into `useAppForm`'s `onSubmit`
- Replace `form.reset()` calls in the success handler
- The dialog open/close state (`setOpen`) is external to the form and stays as-is
- Consider extracting a shared player form component or `withFieldGroup` for the name+image pattern, since Forms 4, 5, and 6 all share it

---

## Form 6: Edit Player Dialog

- **File**: `apps/nextjs/src/app/dashboard/players/_components/editPlayerDialog.tsx`
- **Lines**: 292
- **Complexity**: Medium-High

### Current Implementation

- **Schema**: Dynamic -- `originalPlayerSchema` or `sharedPlayerSchema` selected based on `player.type`, with a `.check()` that validates the name has actually changed
- **Fields**: `name` (text, always), `imageUrl` (file or string or null, only for original players)
- **useForm**: `useForm({ schema: playerSchema, defaultValues: { name: player.name, imageUrl: player.image?.url ?? null } })`
- **Submission**: 3-way branch -- image unchanged / image removed / new image uploaded. Uses `trpc.player.update` mutation
- **File upload**: Same `useUploadThing` pattern with extra logic for "image unchanged" detection

### Migration Notes

- Replace `useForm` with `useAppForm`
- The dynamic schema selection (`player.type === "original" ? originalPlayerSchema : sharedPlayerSchema`) and `.check()` refinement work the same way in TanStack Form's `validators: { onSubmit: dynamicSchema }`
- `imageUrl` field accepts `File | string | null` -- the `FileField` component needs to handle showing an existing image URL as a preview (string case) and allowing replacement with a new File
- The "has name changed" validation via `.check()` translates directly to the Zod schema passed to `validators.onSubmit`
- Replace `!form.formState.isDirty` check on the submit button with `form.Subscribe selector={s => !s.isDirty}`
- Replace `form.reset(defaultValues)` with `form.reset()`
- Conditional rendering of the image field (hidden for shared players) stays as-is

---

## Form 7: Friend Settings

- **File**: `apps/nextjs/src/app/dashboard/friends/[id]/_components/friend-settings-form.tsx`
- **Lines**: 603
- **Complexity**: High (many fields, uniform structure)

### Current Implementation

- **Schema**: 16 fields -- 12 booleans + 4 enums (`"view" | "edit"`)
- **Fields**:
  - `allowSharedMatches`, `autoAcceptMatches`, `autoShareMatches`, `sharePlayersWithMatch`, `includeLocationWithMatch` (booleans)
  - `defaultPermissionForMatches`, `defaultPermissionForPlayers`, `defaultPermissionForLocation`, `defaultPermissionForGame` (enums)
  - `autoAcceptPlayers`, `autoAcceptLocation`, `autoAcceptGame` (booleans)
  - `allowSharedGames`, `allowSharedPlayers`, `allowSharedLocation`, `allowSharedMatches` (booleans)
- **useForm**: `useForm({ schema: formSchema, defaultValues: { ...initialSettings or hardcoded defaults } })`
- **Submission**: `trpc.friend.updateFriendSettings` mutation
- **Watches**: Multiple `form.watch("allowSharedX")` calls to conditionally disable dependent fields

### Migration Notes

- Replace `useForm` with `useAppForm`
- Boolean fields: use `<form.AppField name="allowSharedMatches">{(field) => <field.SwitchField label="..." disabled={...} />}</form.AppField>`
- Enum fields: use `<form.AppField name="defaultPermissionForMatches">{(field) => <field.SelectField label="..." options={[...]} disabled={...} />}</form.AppField>`
- Ensure `SwitchField` and `SelectField` accept a `disabled` prop. If not, add it to the registered components
- Replace all `form.watch("allowSharedX")` with `form.useStore(s => s.values.allowSharedX)` for the conditional disabled state
- Replace `useEffect` that calls `onFormChange(form.formState.isDirty)` with `form.Subscribe selector={s => s.isDirty}` combined with `useEffect`
- The 4-tab layout (Matches, Games, Players, Locations) stays the same
- Replace manual `isSubmitting` state with `form.Subscribe selector={s => s.isSubmitting}`
- Move `onSubmit` logic into `useAppForm`'s `onSubmit`

---

## Shared Cleanup After Priority 1

After all 7 forms are migrated:

- Verify no remaining imports from `@board-games/ui/form` in any of the migrated files
- Run `pnpm turbo run lint typecheck --filter=@board-games/nextjs` to catch any type errors
- Test the match creation flow end-to-end (player selection, team management, role assignment)
- Test the dashboard player add/edit flows
- Test the friend settings form with all tabs
