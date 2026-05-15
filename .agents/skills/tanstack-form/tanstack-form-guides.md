# TanStack Form Guides & Patterns

## Quick Start (React)

### Recommended: createFormHook Pattern

```tsx
import { createFormHookContexts, createFormHook } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";

// 1. Create contexts
const { fieldContext, formContext } = createFormHookContexts();

// 2. Create hook with bound components
const { useAppForm, AppField, AppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField: ({ field }) => (
      <input
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
    ),
  },
  formComponents: {
    SubmitButton: ({ form }) => (
      <button type="submit" disabled={!form.state.canSubmit}>
        Submit
      </button>
    ),
  },
});

// 3. Use in component
function MyForm() {
  const form = useAppForm({
    defaultValues: { email: "", password: "" },
    onSubmit: ({ value }) => console.log(value),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <AppField name="email" component="TextField" />
      <AppField name="password" component="TextField" />
      <AppForm component="SubmitButton" />
    </form>
  );
}
```

### Alternative: useForm Hook

```tsx
import { useForm } from "@tanstack/react-form";

function MyForm() {
  const form = useForm({
    defaultValues: { firstName: "", age: 0 },
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
      <form.Field name="firstName">
        {(field) => (
          <input
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## Validation

### Field-Level Validation

```tsx
<form.Field
  name="age"
  validators={{
    onChange: ({ value }) => (value < 13 ? "Must be 13 or older" : undefined),
    onBlur: ({ value }) => (value < 0 ? "Age cannot be negative" : undefined),
  }}
>
  {(field) => (
    <>
      <input
        type="number"
        value={field.state.value}
        onChange={(e) => field.handleChange(Number(e.target.value))}
        onBlur={field.handleBlur}
      />
      {field.state.meta.errors.length > 0 && (
        <span>{field.state.meta.errors.join(", ")}</span>
      )}
    </>
  )}
</form.Field>
```

### Async Validation with Debouncing

```tsx
<form.Field
  name="username"
  validators={{
    onChangeAsyncDebounceMs: 500,
    onChangeAsync: async ({ value }) => {
      const exists = await checkUsernameExists(value)
      return exists ? 'Username taken' : undefined
    },
  }}
>
  {(field) => /* ... */}
</form.Field>
```

### Form-Level Validation

```tsx
const form = useForm({
  defaultValues: { password: "", confirmPassword: "" },
  validators: {
    onChange: ({ value }) => {
      if (value.password !== value.confirmPassword) {
        return {
          fields: {
            confirmPassword: "Passwords do not match",
          },
        };
      }
      return undefined;
    },
  },
  onSubmit: ({ value }) => console.log(value),
});
```

### Schema Validation (Zod)

```tsx
import { z } from 'zod'
import { zodValidator } from '@tanstack/zod-form-adapter'

const schema = z.object({
  email: z.string().email(),
  age: z.number().min(18),
})

<form.Field
  name="email"
  validators={{
    onChange: zodValidator(schema.shape.email),
  }}
>
  {(field) => /* ... */}
</form.Field>
```

### Displaying Errors

```tsx
// Array of all errors
{
  field.state.meta.errors.map((error, i) => <span key={i}>{error}</span>);
}

// Errors by timing
{
  field.state.meta.errorMap["onChange"] && (
    <span>{field.state.meta.errorMap["onChange"]}</span>
  );
}
```

---

## Linked Fields (Cross-Field Validation)

```tsx
<form.Field name="password">
  {(field) => (
    <input
      type="password"
      value={field.state.value}
      onChange={(e) => field.handleChange(e.target.value)}
    />
  )}
</form.Field>

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
  {(field) => (
    <input
      type="password"
      value={field.state.value}
      onChange={(e) => field.handleChange(e.target.value)}
    />
  )}
</form.Field>
```

---

## Array Fields

```tsx
const form = useForm({
  defaultValues: {
    people: [] as Array<{ name: string; age: number }>,
  },
  onSubmit: ({ value }) => console.log(value),
})

// In render:
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
          <form.Field name={`people[${i}].age`}>
            {(subField) => (
              <input
                type="number"
                value={subField.state.value}
                onChange={(e) => subField.handleChange(Number(e.target.value))}
              />
            )}
          </form.Field>
          <button type="button" onClick={() => field.removeValue(i)}>
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => field.pushValue({ name: '', age: 0 })}
      >
        Add Person
      </button>
    </>
  )}
</form.Field>
```

---

## Listeners (Side Effects)

### Field-Level Listener

```tsx
<form.Field
  name="country"
  listeners={{
    onChange: ({ value }) => {
      // Reset province when country changes
      form.setFieldValue('province', '')
    },
  }}
>
  {(field) => /* ... */}
</form.Field>
```

### Debounced Listener

```tsx
<form.Field
  name="search"
  listeners={{
    onChangeDebounceMs: 300,
    onChange: ({ value }) => {
      // API call on debounced change
      fetchResults(value)
    },
  }}
>
  {(field) => /* ... */}
</form.Field>
```

### Form-Level Listeners

```tsx
const form = useForm({
  defaultValues: { /* ... */ },
  listeners: {
    onSubmit: ({ formApi }) => {
      console.log('Form submitted')
    },
    onChange: ({ fieldApi, formApi }) => {
      // Auto-save on any change
      saveFormData(formApi.state.values)
    },
  },
  onSubmit: ({ value }) => /* ... */,
})
```

---

## Submission Handling

### Basic Submission

```tsx
const form = useForm({
  defaultValues: { email: '' },
  onSubmit: async ({ value }) => {
    await submitToServer(value)
  },
})

<form onSubmit={(e) => {
  e.preventDefault()
  form.handleSubmit()
}}>
```

### Submission with Metadata

```tsx
type FormMeta = { action: 'save' | 'saveAndContinue' }

const form = useForm({
  defaultValues: { /* ... */ },
  onSubmitMeta: { action: 'save' } as FormMeta,
  onSubmit: async ({ value, meta }) => {
    await save(value)
    if (meta.action === 'saveAndContinue') {
      navigate('/next')
    }
  },
})

// Different buttons
<button onClick={() => form.handleSubmit()}>Save</button>
<button onClick={() => form.handleSubmit({ action: 'saveAndContinue' })}>
  Save & Continue
</button>
```

---

## SSR Integration (Next.js Example)

### Server Action

```tsx
// actions.ts
"use server";
import { formOptions, createServerValidate } from "@tanstack/react-form-nextjs";

export const formOpts = formOptions({
  defaultValues: { email: "" },
});

const serverValidate = createServerValidate({
  ...formOpts,
  onServerValidate: ({ value }) => {
    if (!value.email.includes("@")) {
      return { fields: { email: "Invalid email" } };
    }
  },
});

export async function submitForm(prevState: unknown, formData: FormData) {
  return await serverValidate(formData);
}
```

### Client Component

```tsx
"use client";
import {
  useForm,
  mergeForm,
  initialFormState,
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
        {(field) => <input name="email" value={field.state.value} /* ... */ />}
      </form.Field>
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## UI Library Integration

TanStack Form is headless - integrate with any UI library via render props.

### Pattern

```tsx
<form.Field name="fieldName">
  {({ state, handleChange, handleBlur }) => (
    <UIComponent
      value={state.value}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      error={state.meta.errors[0]}
    />
  )}
</form.Field>
```

### shadcn/ui Checkbox

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

---

## Vue Quick Start

```vue
<script setup>
import { useForm } from "@tanstack/vue-form";

const form = useForm({
  defaultValues: { firstName: "" },
  onSubmit: ({ value }) => console.log(value),
});
</script>

<template>
  <form @submit.prevent="form.handleSubmit()">
    <form.Field name="firstName" v-slot="{ field }">
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

---

## Angular Quick Start

```typescript
import { Component } from "@angular/core";
import { TanStackField, injectForm } from "@tanstack/angular-form";

@Component({
  standalone: true,
  imports: [TanStackField],
  template: `
    <form (submit)="handleSubmit($event)">
      <ng-container [tanstackField]="form" name="fullName" #field="field">
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
    defaultValues: { fullName: "" },
    onSubmit: ({ value }) => console.log(value),
  });

  handleSubmit(event: Event) {
    event.preventDefault();
    this.form.handleSubmit();
  }
}
```
