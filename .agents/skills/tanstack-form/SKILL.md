---
name: tanstack-form
description: TanStack Form — headless, type-safe forms with field/form validation, arrays, listeners, and SSR adapters. Use when building or refactoring forms with @tanstack/react-form (or other framework packages), validation (sync/async, Zod), createFormHook, array fields, or Next.js/TanStack Start form integration.
version: 1.0.0
---

# TanStack Form

Headless, type-safe form management for React, Vue, Angular, Solid, Svelte, and Lit.

Skill content sourced from [eralmansouri/tanstack-claude-plugin](https://github.com/eralmansouri/tanstack-claude-plugin/tree/3858cbbef96b236bc23c626c09416f6427906522) (commit `3858cbb`).

**This monorepo** uses **Bun** at the root — install packages with `bun add` in the target workspace (e.g. `apps/web`) instead of `npm install` when adding TanStack Form here.

## Installation

```bash
npm install @tanstack/react-form    # React
npm install @tanstack/vue-form      # Vue
npm install @tanstack/angular-form  # Angular
npm install @tanstack/solid-form    # Solid
npm install @tanstack/svelte-form   # Svelte
npm install @tanstack/lit-form      # Lit
```

Requires TypeScript >=5.4 with `strict: true` in tsconfig.

## Quick Start (React)

```tsx
import { useForm } from "@tanstack/react-form";

function MyForm() {
  const form = useForm({
    defaultValues: { email: "", password: "" },
    onSubmit: async ({ value }) => {
      console.log(value);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field name="email">
        {(field) => (
          <input
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>
      <form.Field name="password">
        {(field) => (
          <input
            type="password"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>
      <button type="submit" disabled={!form.state.canSubmit}>
        Submit
      </button>
    </form>
  );
}
```

## Field Validation

```tsx
<form.Field
  name="email"
  validators={{
    onChange: ({ value }) =>
      !value.includes("@") ? "Invalid email" : undefined,
    onBlur: ({ value }) => (!value ? "Email is required" : undefined),
  }}
>
  {(field) => (
    <>
      <input
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
      {field.state.meta.errors.length > 0 && (
        <span>{field.state.meta.errors.join(", ")}</span>
      )}
    </>
  )}
</form.Field>
```

### Validation Timing Options

| Option          | When it runs           |
| --------------- | ---------------------- |
| `onChange`      | Every value change     |
| `onBlur`        | When field loses focus |
| `onSubmit`      | On form submission     |
| `onMount`       | When field mounts      |
| `onChangeAsync` | Async on change        |
| `onBlurAsync`   | Async on blur          |

### Async Validation with Debounce

```tsx
validators={{
  onChangeAsyncDebounceMs: 500,
  onChangeAsync: async ({ value }) => {
    const exists = await checkUsernameExists(value)
    return exists ? 'Username taken' : undefined
  },
}}
```

### Schema Validation (Zod)

```tsx
import { zodValidator } from '@tanstack/zod-form-adapter'
import { z } from 'zod'

<form.Field
  name="email"
  validators={{
    onChange: zodValidator(z.string().email()),
  }}
>
```

## Form-Level Validation

```tsx
const form = useForm({
  defaultValues: { password: "", confirmPassword: "" },
  validators: {
    onChange: ({ value }) => {
      if (value.password !== value.confirmPassword) {
        return { fields: { confirmPassword: "Passwords must match" } };
      }
      return undefined;
    },
  },
  onSubmit: ({ value }) => console.log(value),
});
```

## Linked Fields (Cross-Field Validation)

```tsx
<form.Field
  name="confirmPassword"
  validators={{
    onChangeListenTo: ['password'],
    onChange: ({ value, fieldApi }) => {
      if (value !== fieldApi.form.getFieldValue('password')) {
        return 'Passwords do not match'
      }
      return undefined
    },
  }}
>
```

## Array Fields

```tsx
const form = useForm({
  defaultValues: { people: [] as Array<{ name: string; age: number }> },
  onSubmit: ({ value }) => console.log(value),
})

<form.Field name="people" mode="array">
  {(field) => (
    <>
      {field.state.value.map((_, i) => (
        <div key={i}>
          <form.Field name={`people[${i}].name`}>
            {(subField) => (
              <input
                value={subField.state.value}
                onChange={(e) => subField.handleChange(e.target.value)}
              />
            )}
          </form.Field>
          <button type="button" onClick={() => field.removeValue(i)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={() => field.pushValue({ name: '', age: 0 })}>
        Add Person
      </button>
    </>
  )}
</form.Field>
```

### Array Methods

| Method                       | Description          |
| ---------------------------- | -------------------- |
| `pushValue(value)`           | Add to end           |
| `insertValue(index, value)`  | Insert at index      |
| `removeValue(index)`         | Remove at index      |
| `replaceValue(index, value)` | Replace at index     |
| `swapValues(indexA, indexB)` | Swap positions       |
| `moveValue(from, to)`        | Move to new position |
| `clearValues()`              | Remove all           |

## Listeners (Side Effects)

```tsx
<form.Field
  name="country"
  listeners={{
    onChange: ({ value }) => {
      form.setFieldValue('province', '') // Reset dependent field
    },
    onChangeDebounceMs: 300, // Optional debounce
  }}
>
```

### Form-Level Listeners

```tsx
const form = useForm({
  defaultValues: {
    /* ... */
  },
  listeners: {
    onChange: ({ fieldApi, formApi }) => {
      autoSave(formApi.state.values);
    },
    onSubmit: ({ formApi }) => {
      console.log("Submitted");
    },
  },
});
```

## Form State

| Property       | Description                 |
| -------------- | --------------------------- |
| `values`       | Current form values         |
| `errors`       | Array of form errors        |
| `isValid`      | All validations passing     |
| `isValidating` | Validation in progress      |
| `isSubmitting` | Submission in progress      |
| `canSubmit`    | Form can be submitted       |
| `isDirty`      | Values changed from default |
| `isPristine`   | No changes made             |

## Field State

| Property         | Description                |
| ---------------- | -------------------------- |
| `value`          | Current field value        |
| `meta.errors`    | Array of field errors      |
| `meta.errorMap`  | Errors keyed by timing     |
| `meta.isValid`   | Field is valid             |
| `meta.isTouched` | Field was changed/blurred  |
| `meta.isDirty`   | Value differs from default |
| `meta.isBlurred` | Field lost focus           |

## FormApi Methods

```tsx
form.getFieldValue("email");
form.setFieldValue("email", "new@email.com");
form.reset();
form.resetField("email");
form.validateField("email");
form.validateAllFields();
form.handleSubmit();
```

## Vue Quick Start

```vue
<script setup>
import { useForm } from "@tanstack/vue-form";

const form = useForm({
  defaultValues: { name: "" },
  onSubmit: ({ value }) => console.log(value),
});
</script>

<template>
  <form @submit.prevent="form.handleSubmit()">
    <form.Field name="name" v-slot="{ field }">
      <input
        :value="field.state.value"
        @input="(e) => field.handleChange(e.target.value)"
        @blur="field.handleBlur()"
      />
    </form.Field>
    <button type="submit">Submit</button>
  </form>
</template>
```

## Angular Quick Start

```typescript
import { Component } from "@angular/core";
import { TanStackField, injectForm } from "@tanstack/angular-form";

@Component({
  standalone: true,
  imports: [TanStackField],
  template: `
    <form (submit)="handleSubmit($event)">
      <ng-container [tanstackField]="form" name="name" #field="field">
        <input
          [value]="field.api.state.value"
          (input)="field.api.handleChange($any($event.target).value)"
          (blur)="field.api.handleBlur()"
        />
      </ng-container>
      <button type="submit">Submit</button>
    </form>
  `,
})
export class MyFormComponent {
  form = injectForm({
    defaultValues: { name: "" },
    onSubmit: ({ value }) => console.log(value),
  });

  handleSubmit(event: Event) {
    event.preventDefault();
    this.form.handleSubmit();
  }
}
```

## SSR (Next.js)

```tsx
// actions.ts
"use server";
import { formOptions, createServerValidate } from "@tanstack/react-form-nextjs";

export const formOpts = formOptions({
  defaultValues: { email: "" },
});

export async function submitForm(prevState: unknown, formData: FormData) {
  const serverValidate = createServerValidate({
    ...formOpts,
    onServerValidate: ({ value }) => {
      if (!value.email.includes("@")) {
        return { fields: { email: "Invalid email" } };
      }
    },
  });
  return await serverValidate(formData);
}
```

```tsx
// component.tsx
"use client";
import {
  useForm,
  mergeForm,
  initialFormState,
  useTransform,
} from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { formOpts, submitForm } from "./actions";

export function MyForm() {
  const [state, action] = useActionState(submitForm, initialFormState);
  const form = useForm({
    ...formOpts,
    transform: useTransform((baseForm) => mergeForm(baseForm, state), [state]),
  });

  return (
    <form action={action}>
      <form.Field name="email">
        {(field) => <input name="email" value={field.state.value} />}
      </form.Field>
      <button type="submit">Submit</button>
    </form>
  );
}
```

## UI Library Integration

TanStack Form is headless — integrate with any UI library:

```tsx
<form.Field name="terms">
  {(field) => (
    <Checkbox
      checked={field.state.value}
      onCheckedChange={(checked) => field.handleChange(!!checked)}
    />
  )}
</form.Field>
```

## References

- [API Reference](tanstack-form-api.md) - Complete FormApi and FieldApi documentation
- [Guides](tanstack-form-guides.md) - Detailed patterns and examples
- [Overview](tanstack-form-overview.md) - Philosophy and core concepts
