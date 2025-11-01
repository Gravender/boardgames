import { createFormHook, createFormHookContexts } from "@tanstack/react-form";

export const { fieldContext, useFieldContext, formContext, useFormContext } =
  createFormHookContexts();

const formHook = createFormHook({
  fieldComponents: {},
  formComponents: {},
  fieldContext,
  formContext,
});

export const { useAppForm, withForm, withFieldGroup } = formHook;
