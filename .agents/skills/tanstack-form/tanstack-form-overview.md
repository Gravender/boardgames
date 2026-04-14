# TanStack Form Overview

TanStack Form is a headless, type-safe form management library supporting React, Vue, Angular, Solid, Svelte, and Lit.

## Installation

```bash
# React
npm install @tanstack/react-form

# Vue
npm install @tanstack/vue-form

# Angular
npm install @tanstack/angular-form

# Solid
npm install @tanstack/solid-form

# Svelte
npm install @tanstack/svelte-form

# Lit
npm install @tanstack/lit-form
```

### Meta-Framework Adapters (React)

```bash
# TanStack Start
npm install @tanstack/react-form-start

# Next.js
npm install @tanstack/react-form-nextjs

# Remix
npm install @tanstack/react-form-remix
```

### DevTools

```bash
# React
npm install @tanstack/react-devtools @tanstack/react-form-devtools

# Solid
npm install @tanstack/solid-devtools @tanstack/solid-form-devtools
```

## Philosophy & Design Principles

### 1. Unified API

One cohesive API rather than multiple approaches. Higher initial learning curve but eliminates confusion.

### 2. Flexibility

- Multiple validation timing options (blur, change, submit, mount)
- Various validation strategies (field, form, or subsets)
- Integration with Zod, Valibot, ArkType, Yup
- Async validation with built-in debouncing

### 3. Controlled Inputs

Committed to controlled inputs for:

- Predictability and testability
- Non-DOM renderer support (React Native, Three.js)
- Conditional field logic
- State inspection for debugging

### 4. Type Inference

No generics needed - types are inferred from runtime defaults. TypeScript and JavaScript usage is nearly identical.

### 5. Composability

Designed to be wrapped into your own component/design systems.

## TypeScript Requirements

- `strict: true` in `tsconfig.json`
- TypeScript v5.4+
- Type enhancements are non-breaking (patch releases)

## Core Concepts

### Form Instance

Created via framework-specific hooks (`useForm`, `injectForm`). Manages overall state and provides field manipulation methods.

### Field

Individual inputs created with `form.Field` components. Use `name` prop matching form data keys.

### Field State

- `isTouched` - After user change or blur
- `isDirty` - Persists after any change
- `isPristine` - Opposite of isDirty
- `isBlurred` - After losing focus
- `isDefaultValue` - Matches initial value

### Validation

Synchronous and asynchronous validators via the `validators` prop. Integrates with Standard Schema libraries.

### Reactivity

Use `useStore(form.store)` with selectors and `form.Subscribe` for optimized rendering.

### Array Fields

Use `mode="array"` with helpers: `pushValue`, `removeValue`, `swapValues`, `moveValue`, `insertValue`, `replaceValue`, `clearValues`.

### Listeners

Respond to events (`onChange`, `onBlur`, `onMount`, `onSubmit`) with side effects.
