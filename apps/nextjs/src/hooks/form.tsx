import { createFormHook, createFormHookContexts } from "@tanstack/react-form";

import { SubscribeButton } from "~/components/form/submit";

export const { fieldContext, useFieldContext, formContext, useFormContext } =
  createFormHookContexts();

const formHook = createFormHook({
  fieldComponents: {},
  formComponents: {
    SubscribeButton,
  },
  fieldContext,
  formContext,
});

export const { useAppForm, withForm, withFieldGroup } = formHook;
