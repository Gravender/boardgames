# TanStack Form API Reference

## FormApi Class

The core class managing form state. Access through framework hooks (`useForm`, `injectForm`) rather than direct instantiation.

### Properties

| Property           | Description                               |
| ------------------ | ----------------------------------------- |
| `baseStore`        | Foundational form state store             |
| `store`            | Derived store with complete form state    |
| `options`          | Configuration object                      |
| `fieldInfo`        | Record tracking metadata for each field   |
| `fieldMetaDerived` | Derived state with partial field metadata |

### Accessors

| Accessor | Description                |
| -------- | -------------------------- |
| `formId` | Unique string identifier   |
| `state`  | Current FormState snapshot |

### Methods

#### Field Value Operations

```typescript
// Get/Set values
form.getFieldValue(name)
form.setFieldValue(name, value, opts?)

// Array operations
form.pushFieldValue(name, value, opts?)
form.insertFieldValue(name, index, value, opts?)
form.removeFieldValue(name, index, opts?)
form.replaceFieldValue(name, index, value, opts?)
form.swapFieldValues(name, indexA, indexB, opts?)
form.moveFieldValues(name, fromIndex, toIndex, opts?)
form.clearFieldValues(name, opts?)
form.deleteField(name)
```

#### Validation

```typescript
form.validateField(name, cause?)
form.validateAllFields(cause?)
form.setErrorMap(errorMap)
```

#### Submission

```typescript
form.handleSubmit();
```

#### State Management

```typescript
form.reset();
form.resetField(name);
form.resetFieldMeta(name);
form.update(options);
form.mount();
```

---

## FieldApi Class

Manages individual field state and validation.

### Properties

| Property  | Description                  |
| --------- | ---------------------------- |
| `form`    | Parent FormApi reference     |
| `name`    | Field identifier             |
| `options` | Field configuration          |
| `store`   | Derived FieldState container |

### Methods

#### State Management

```typescript
field.getValue()
field.setValue(updater, opts?)
field.getMeta()
field.setMeta(updater)
field.getInfo()
```

#### Array Operations (for array fields)

```typescript
field.pushValue(value, opts?)
field.insertValue(index, value, opts?)
field.removeValue(index, opts?)
field.replaceValue(index, value, opts?)
field.moveValue(fromIndex, toIndex, opts?)
field.swapValues(indexA, indexB, opts?)
field.clearValues(opts?)
```

#### Validation & Events

```typescript
field.validate(cause, opts?)
field.handleChange(updater)
field.handleBlur()
field.setErrorMap(errorMap)
```

#### Lifecycle

```typescript
field.mount();
field.update(opts);
field.parseValueWithSchema(schema);
```

---

## Key Functions

| Function                        | Description                                     |
| ------------------------------- | ----------------------------------------------- |
| `formOptions()`                 | Create shared form configuration                |
| `createFormHook()`              | Create reusable form hook factory               |
| `createFormHookContexts()`      | Create form contexts for hook factory           |
| `mergeForm()`                   | Merge server state with client form state (SSR) |
| `createFieldMap()`              | Create field mapping utilities                  |
| `isGlobalFormValidationError()` | Check if error is form-level                    |
| `isStandardSchemaValidator()`   | Check if validator uses Standard Schema         |

---

## Form State

```typescript
interface FormState {
  values: TFormData;
  errors: string[];
  errorMap: Record<string, string>;
  isValid: boolean;
  isValidating: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  submitCount: number;
  canSubmit: boolean;
  isPristine: boolean;
  isDirty: boolean;
}
```

## Field State

```typescript
interface FieldState {
  value: TData;
  meta: {
    errors: string[];
    errorMap: Record<string, string>;
    isValid: boolean;
    isValidating: boolean;
    isTouched: boolean;
    isBlurred: boolean;
    isDirty: boolean;
    isPristine: boolean;
    isDefaultValue: boolean;
  };
}
```

## Validation Timing Options

| Option          | When Validation Runs       |
| --------------- | -------------------------- |
| `onChange`      | On every value change      |
| `onChangeAsync` | Async validation on change |
| `onBlur`        | When field loses focus     |
| `onBlurAsync`   | Async validation on blur   |
| `onSubmit`      | On form submission         |
| `onSubmitAsync` | Async validation on submit |
| `onMount`       | When field mounts          |
| `onMountAsync`  | Async validation on mount  |

## Debouncing Options

```typescript
validators={{
  onChangeAsyncDebounceMs: 500,
  onBlurAsyncDebounceMs: 500,
  onChangeAsync: async ({ value }) => { /* ... */ }
}}
```
