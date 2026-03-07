---
name: ""
overview: ""
todos: []
isProject: false
---

# Priority 4: TanStack Form Migration -- Auth Forms and Account Management

## Overview

Priority 4 covers the **6 authentication and account management forms**. These are isolated from the rest of the app's form ecosystem -- they don't share fields, schemas, or state with any dashboard forms. The primary reason to migrate them is to fully remove the `react-hook-form` and `@hookform/resolvers` dependencies from the project. If removing those dependencies isn't a goal, this priority can be deferred indefinitely.

## Prerequisites

- No strict dependency on Priorities 1-3
- These forms use `authClient` (Better Auth) directly rather than tRPC, so the `onSubmit` pattern differs slightly -- `authClient` methods use callback-style APIs (`onSuccess`, `onError`, `onLoading`) that need wrapping in Promises for TanStack Form's async `onSubmit`

## Dependencies

- All 6 forms are independent of each other
- Suggested order below goes from simplest to most complex

## Special Consideration: Better Auth Client Integration

Most auth forms call `authClient.signIn`, `authClient.signUp`, `authClient.forgetPassword`, etc. These use a callback pattern:

```typescript
authClient.signIn.username({
  username,
  password,
}, {
  onSuccess: () => { ... },
  onError: (ctx) => { ... },
});
```

For TanStack Form's `onSubmit` (which expects a Promise or void), wrap these calls:

```typescript
onSubmit: async ({ value }) => {
  await authClient.signIn.username(
    { username: value.username, password: value.password },
    {
      onSuccess: () => { toast.success("..."); redirect("/dashboard"); },
      onError: (ctx) => { toast.error(ctx.error.message); },
    },
  );
},
```

If `authClient` methods return Promises (check the Better Auth SDK), you can `await` them directly. If they're callback-only, wrap in `new Promise()`.

## Migration Order

1. Forgot password (simplest -- 1 field)
2. Reset password (2 fields + token from URL)
3. Login (2 fields + social buttons)
4. Signup (4 fields + social buttons)
5. Change password (3 fields + conditional render)
6. Delete account (1 field, dynamic schema)

---

## Form 1: Forgot Password

- **File**: `apps/nextjs/src/components/forgot-password-form.tsx`
- **Lines**: 119
- **Complexity**: Low

### Current Implementation

- **Schema**: `z.object({ email: z.string().email() })`
- **Fields**: `email` (text input)
- **useForm**: `useForm({ schema: formSchema, defaultValues: { email: "" } })`
- **Submission**: `authClient.forgetPassword({ email, redirectTo: "/reset-password" })` with toast

### Migration Notes

- Replace `useForm` with `useAppForm`
- `email`: `<form.AppField name="email">{(field) => <field.TextField label="Email" type="email" />}</form.AppField>`
- Wrap `authClient.forgetPassword` in async `onSubmit`
- Replace manual `isLoading` state with `form.Subscribe selector={s => s.isSubmitting}` or `SubscribeButton`
- Card layout and "Sign up" / "Back to login" links stay unchanged

---

## Form 2: Reset Password

- **File**: `apps/nextjs/src/components/reset-password-form.tsx`
- **Lines**: 148
- **Complexity**: Low

### Current Implementation

- **Schema**: `z.object({ password: z.string().min(8), confirmPassword: z.string().min(8) })`
- **Fields**: `password` (text), `confirmPassword` (text)
- **useForm**: `useForm({ schema: formSchema, defaultValues: { password: "", confirmPassword: "" } })`
- **Submission**: Imperatively checks `password !== confirmPassword`, then calls `authClient.resetPassword({ newPassword, token })`

### Migration Notes

- Replace `useForm` with `useAppForm`
- Move the `password !== confirmPassword` check into the Zod schema using `.check()`:

```typescript
z.object({
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
}).check((ctx) => {
  if (ctx.value.password !== ctx.value.confirmPassword) {
    ctx.issues.push({
      code: "custom",
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });
  }
});
```

- `password` / `confirmPassword`: `<form.AppField name="password">{(field) => <field.TextField label="Password" type="password" />}</form.AppField>`
- Reads `token` from `useSearchParams()` -- stays unchanged
- Wrap `authClient.resetPassword` in async `onSubmit`

---

## Form 3: Login

- **File**: `apps/nextjs/src/components/login-form.tsx`
- **Lines**: 204
- **Complexity**: Low

### Current Implementation

- **Schema**: `z.object({ username: z.string(), password: z.string().min(8) })`
- **Fields**: `username` (text), `password` (text)
- **useForm**: `useForm({ schema: formSchema, defaultValues: { username: "", password: "" } })`
- **Submission**: `authClient.signIn.username(...)` with redirect on success

### Migration Notes

- Replace `useForm` with `useAppForm`
- `username`: `<form.AppField name="username">{(field) => <field.TextField label="Username" />}</form.AppField>`
- `password`: `<form.AppField name="password">{(field) => <field.TextField label="Password" type="password" />}</form.AppField>`
- Social login buttons (Google, GitHub) are not part of the form -- they call `authClient.signIn.social` independently and stay unchanged
- The "Forgot password?" link stays unchanged
- Wrap `authClient.signIn.username` in async `onSubmit`
- Replace manual `isLoading` with `form.Subscribe` or `SubscribeButton`

---

## Form 4: Signup

- **File**: `apps/nextjs/src/components/signup-form.tsx`
- **Lines**: 246
- **Complexity**: Low

### Current Implementation

- **Schema**: `z.object({ name: z.string().min(2), username: z.string().min(3), email: z.string().email(), password: z.string().min(8) })`
- **Fields**: `name` (text), `username` (text), `email` (text), `password` (text)
- **useForm**: `useForm({ schema: formSchema, defaultValues: { username: "", name: "", email: "", password: "" } })`
- **Submission**: `authClient.signUp.email(...)` with redirect on success

### Migration Notes

- Replace `useForm` with `useAppForm`
- All 4 fields use `<form.AppField>{(field) => <field.TextField ... />}</form.AppField>` with appropriate labels and types
- Social signup buttons stay unchanged
- Wrap `authClient.signUp.email` in async `onSubmit`
- Replace manual `isLoading` with `form.Subscribe` or `SubscribeButton`

---

## Form 5: Change Password

- **File**: `apps/nextjs/src/components/better-auth/sessions/change-password.tsx`
- **Lines**: 292
- **Complexity**: Medium

### Current Implementation

- **Schema**: `z.object({ currentPassword: z.string().min(8), newPassword: z.string().min(8), confirmPassword: z.string().min(8) }).check(...)` validating `newPassword === confirmPassword`
- **Fields**: `currentPassword`, `newPassword`, `confirmPassword` (all password inputs with show/hide toggle)
- **useForm**: `useForm({ schema: formSchema, defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } })`
- **Submission**: `changePassword.mutate(...)` wrapping `authClient.changePassword`
- **Conditional render**: If no credential account is linked, shows a "Set Password" card instead (sends reset email via `authClient.requestPasswordReset`)

### Migration Notes

- Replace `useForm` with `useAppForm`
- The `.check()` refinement for password matching passes directly to `validators: { onSubmit: schema }`
- All 3 fields use custom `PasswordInput` sub-component (with show/hide eye icon toggle). These need `form.Field` with inline render since `TextField` doesn't have a password visibility toggle:

```
  <form.Field name="currentPassword">
    {(field) => (
      <Field>
        <FieldLabel>Current Password</FieldLabel>
        <PasswordInput
          value={field.state.value}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
        />
        <FieldError errors={field.state.meta.errors} />
      </Field>
    )}
  </form.Field>


```

- The conditional render (credential account linked vs not) stays the same -- only the password change form needs migration, not the "Set Password" button
- The `useMutation` wrapping `authClient.changePassword` can move into `useAppForm`'s `onSubmit`, or stay as a separate mutation called from `onSubmit`
- Replace `form.formState.isSubmitting` check with `form.Subscribe`
- The Skeleton loading states stay unchanged

---

## Form 6: Delete Account

- **File**: `apps/nextjs/src/components/better-auth/account/delete-account-card.tsx`
- **Lines**: 212
- **Complexity**: Low-Medium

### Current Implementation

- **Schema**: Dynamic -- `z.object({ password: credentialsLinked ? z.string().min(3) : z.string().optional() })`. Schema changes based on whether the user has a credential account
- **Fields**: `password` (text input, only visible/required if credentials are linked)
- **useForm**: `useForm({ schema: formSchema, defaultValues: { password: "" } })`
- **Submission**: `authClient.deleteUser(...)` if credentials linked (passes password), or sign-out if session is stale

### Migration Notes

- Replace `useForm` with `useAppForm`
- The dynamic schema (based on `credentialsLinked`) passes directly to `validators: { onSubmit: dynamicSchema }`
- `password`: Conditionally rendered -- when shown, use `<form.AppField name="password">{(field) => <field.TextField label="Password" type="password" />}</form.AppField>`
- The two-component structure (DeleteAccountCard trigger + DeleteAccountDialog confirmation) stays the same
- Replace `form.formState.isSubmitting` with `form.Subscribe`
- The destructive styling stays unchanged

---

## Final Cleanup After Priority 4

After all 6 forms are migrated, **all React Hook Form usage is eliminated**:

1. Remove `react-hook-form` and `@hookform/resolvers` from dependencies:

- Check `apps/nextjs/package.json` for direct dependencies
- Check `packages/ui/package.json` for the `@board-games/ui/form` export
- Check `pnpm-workspace.yaml` catalog for shared versions

1. Remove or refactor the `@board-games/ui/form` module:

- If the Expo app still uses React Hook Form, keep the module but remove the Next.js app's dependency on it
- If both apps are migrated, remove the module entirely

1. Remove unused form components from `@board-games/ui`:

- `Form`, `FormControl`, `FormDescription`, `FormField`, `FormItem`, `FormLabel`, `FormMessage`
- `useFormField` hook
- Keep any primitives (like `Input`, `Select`, etc.) that are used outside of forms

1. Run full quality checks:

```bash
   pnpm turbo run lint typecheck --filter=@board-games/nextjs
   pnpm turbo run lint typecheck --filter=@board-games/ui


```

1. Test all auth flows:

- Login (username + social)
- Signup (email + social)
- Forgot password -> Reset password
- Change password
- Delete account (with and without credential account)
