# Priority 3: TanStack Form Migration -- Entity Dialogs, Profile, BGG Upload

## Overview

Priority 3 covers **7 simple, low-frequency forms**: location CRUD dialogs, group CRUD dialogs, the add-friend dialog, profile details, and the BGG data upload form. These are quick wins (15-30 minutes each) that further reduce the React Hook Form surface area. They can be migrated opportunistically as you touch these files for other reasons, or done as a dedicated batch.

## Prerequisites

- Priority 1 should be complete (establishes core patterns and `FileField`)
- No strict dependency on Priority 2
- The `FileField` component is needed for Form 7 (BGG upload) if you want to use it for the JSON file input

## Dependencies

- All 7 forms are independent of each other -- migrate in any order
- Suggested order below goes from simplest to most complex

## Migration Order

1. Edit location dialog (simplest -- 1 field)
2. Edit group dialog (1 field)
3. Add location dialog (2 fields)
4. Add group dialog (2 fields + Zustand store)
5. Profile details (2 fields + Better Auth client)
6. Add friend dialog (2 separate mini-forms)
7. Upload BGG data (file input + JSON parsing)

---

## Form 1: Edit Location Dialog

- **File**: `apps/nextjs/src/app/dashboard/locations/_components/editLocationDialog.tsx`
- **Lines**: 154
- **Complexity**: Low

### Current Implementation

- **Schema**: `z.object({ name: z.string().min(1) })`
- **Fields**: `name` (text input)
- **useForm**: `useForm({ schema: locationSchema, defaultValues: { name: location.name } })`
- **Submission**: `trpc.location.update` mutation, branches on `location.type` ("original" vs "shared") for different payloads. Invalidates multiple query keys depending on type, calls `router.refresh()`

### Migration Notes

- Replace `useForm` with `useAppForm`
- `name`: `<form.AppField name="name">{(field) => <field.TextField label="Name" />}</form.AppField>`
- Move mutation + branching logic into `useAppForm`'s `onSubmit`
- Replace manual `isSubmitting` state with `form.Subscribe` or `SubscribeButton`
- Dialog open/close state stays external

---

## Form 2: Edit Group Dialog

- **File**: `apps/nextjs/src/app/dashboard/groups/_components/editGroupDialog.tsx`
- **Lines**: 153
- **Complexity**: Low

### Current Implementation

- **Schema**: `insertGroupSchema.pick({ name: true })` from `@board-games/db/zodSchema`
- **Fields**: `name` (text input)
- **useForm**: `useForm({ schema: groupSchema, defaultValues: { name: group.name } })`
- **Submission**: `trpc.group.update` mutation with `{ id: group.id, name: values.name }`

### Migration Notes

- Same pattern as Form 1
- `name`: `<form.AppField name="name">{(field) => <field.TextField label="Name" />}</form.AppField>`
- The "Edit Players" button (navigates to separate route) is not part of the form and stays unchanged
- Replace manual `isSubmitting` with `SubscribeButton`

---

## Form 3: Add Location Dialog

- **File**: `apps/nextjs/src/app/dashboard/locations/_components/addLocationDialog.tsx`
- **Lines**: 168
- **Complexity**: Low

### Current Implementation

- **Schema**: `z.object({ name: z.string().min(1), isDefault: z.boolean() })`
- **Fields**: `name` (text input), `isDefault` (Switch toggle)
- **useForm**: `useForm({ schema: formSchema, defaultValues: { name: "", isDefault: false } })`
- **Submission**: `trpc.location.create` mutation

### Migration Notes

- `name`: `<form.AppField name="name">{(field) => <field.TextField label="Name" />}</form.AppField>`
- `isDefault`: `<form.AppField name="isDefault">{(field) => <field.SwitchField label="Default Location" />}</form.AppField>`
- Replace manual `isSubmitting` with `SubscribeButton`
- Split component structure (AddLocationDialog wrapper + LocationContent form) stays the same

---

## Form 4: Add Group Dialog

- **File**: `apps/nextjs/src/app/dashboard/groups/_components/addGroupDialog.tsx`
- **Lines**: 179
- **Complexity**: Low-Medium

### Current Implementation

- **Schema**: `groupSchema.extend({ players: playersSchema })` -- schemas imported from `~/stores/add-group-store`
- **Fields**: `name` (text input), `players` (array, but rendered as a Button that navigates to `/add/players` route)
- **useForm**: `useForm({ schema: formSchema, defaultValues: { name: group.name, players: group.players } })`
- **Submission**: `trpc.group.create` mutation, resets Zustand store on success

### Migration Notes

- `name`: `<form.AppField name="name">{(field) => <field.TextField label="Name" />}</form.AppField>`
- `players` is not a traditional form field -- it's a display-only count badge with a navigation button. Use `form.Field` with inline render just to show the count, or access it via `form.useStore(s => s.values.players.length)` outside any field
- The Zustand store (`useAddGroupStore`) interaction stays the same
- `useEffect` that resets the store when the dialog closes stays the same
- Replace manual `isSubmitting` with `SubscribeButton`

---

## Form 5: Profile Details

- **File**: `apps/nextjs/src/app/dashboard/settings/profile/_components/profile-details.tsx`
- **Lines**: 148
- **Complexity**: Low

### Current Implementation

- **Schema**: `z.object({ name: z.string().min(2), username: z.string().min(2).regex(/^[a-zA-Z0-9_]+$/) })`
- **Fields**: `name` (text), `username` (text with regex validation and description)
- **useForm**: `useForm({ schema: profileFormSchema, defaultValues: { name: user.name, username: user.username ?? "" } })`
- **Submission**: Calls `authClient.updateUser(...)` directly (not tRPC) with `onSuccess`/`onLoading`/`onError` callbacks

### Migration Notes

- Replace `useForm` with `useAppForm`
- `name`: `<form.AppField name="name">{(field) => <field.TextField label="Name" />}</form.AppField>`
- `username`: `<form.AppField name="username">{(field) => <field.TextField label="Username" description="..." />}</form.AppField>` -- ensure `TextField` supports a `description` prop, or use `form.Field` with inline render to include `<FieldDescription>`
- The `authClient.updateUser` call uses callbacks (`onSuccess`, `onLoading`, `onError`) rather than awaiting a promise. For TanStack Form's `onSubmit`, either:
  - Wrap it in a Promise: `return new Promise((resolve, reject) => { authClient.updateUser({ ...callbacks, onSuccess: () => { ...; resolve(); }, onError: (e) => { ...; reject(e); } }) })`
  - Or keep the manual `isLoading` state and call `authClient.updateUser` outside the form's `onSubmit` (less ideal)
- Replace `form.formState.isSubmitting` check with `form.Subscribe`

---

## Form 6: Add Friend Dialog

- **File**: `apps/nextjs/src/app/dashboard/friends/_components/add-friend-dialog.tsx`
- **Lines**: 261
- **Complexity**: Low-Medium

### Current Implementation

- **Two separate forms** in a tabbed layout:
  - Email form: schema `z.object({ email: z.string().email() })`, `useForm({ schema: emailSchema })`
  - Username form: schema `z.object({ username: z.string().min(3) })`, `useForm({ schema: usernameSchema })`
- **Submission**: Both funnel through `handleSubmit(value, type)` which calls `trpc.friend.sendFriendRequest` mutation with `{ type: "email", email }` or `{ type: "username", username }`

### Migration Notes

- Two separate `useAppForm` calls -- one for each tab's form
- Email form: `<form.AppField name="email">{(field) => <field.TextField label="Email" type="email" />}</form.AppField>`
- Username form: `<form.AppField name="username">{(field) => <field.TextField label="Username" />}</form.AppField>`
- Each form has its own `<form>` element and submit handler
- The shared `handleSubmit` helper that calls the mutation can be extracted and passed to each form's `onSubmit`
- Replace the shared manual `isSubmitting` state -- each form's `onSubmit` will manage its own `isSubmitting` via TanStack Form. If they need to share loading state (disable both tabs during submit), use a `useState` or derive from both forms
- The Mail/AtSign icon prefixes inside inputs will need `form.Field` with inline render since `TextField` doesn't support icon prefixes -- or extend `TextField` to accept a `startAdornment` prop

---

## Form 7: Upload BGG Data

- **File**: `apps/nextjs/src/app/dashboard/settings/_components/uploadBGGdata.tsx`
- **Lines**: 293
- **Complexity**: Medium

### Current Implementation

- **Schema**: `z.object({ jsonFile: z.file().mime(["application/json"]).max(4_000_000) })`
- **Fields**: `jsonFile` (file input with custom drag-and-drop styled label)
- **useForm**: `useForm({ schema: formSchema, defaultValues: { jsonFile: undefined } })`
- **Submission**: Reads file via `values.jsonFile.text()`, parses JSON, extracts games/plays/players/locations, calls `trpc.game.importBGGGames` mutation

### Migration Notes

- Replace `useForm` with `useAppForm`
- `jsonFile`: This is a JSON file upload (not an image), so `FileField` from Priority 1 won't directly apply (it's designed for image preview). Use `form.Field` with inline render wrapping the existing drag-and-drop file input UI
- The custom `onChange` handler that extracts the `File` from the event translates to `field.handleChange(file)` inside the inline render
- Move the file reading + JSON parsing + mutation logic into `useAppForm`'s `onSubmit`
- Replace manual `isSubmitting` state with `form.Subscribe`
- The large TypeScript interface block (BGG JSON types, ~150 lines) stays unchanged
- Note: this file is 293 lines, with ~150 of those being type definitions. The actual form code is ~140 lines

---

## Shared Cleanup After Priority 3

After all 7 forms are migrated:

- Run `pnpm turbo run lint typecheck --filter=@board-games/nextjs`
- Test all location CRUD operations
- Test all group CRUD operations (including the player selection navigation flow)
- Test profile editing
- Test friend request sending via both email and username
- Test BGG data import
- At this point, only Priority 4 (auth forms) should remain on React Hook Form
