import { createFormHook, createFormHookContexts } from "@tanstack/react-form";

import { CheckboxField } from "~/components/form/checkbox-field";
import { DateField } from "~/components/form/date-field";
import { NullableNumberField, NumberField } from "~/components/form/number-field";
import { SelectField } from "~/components/form/select-field";
import { SliderField } from "~/components/form/slider-field";
import { SubscribeButton } from "~/components/form/submit";
import { SwitchField } from "~/components/form/switch-field";
import {
  NullableTextAreaField,
  TextAreaField,
} from "~/components/form/text-area-field";
import { TextField } from "~/components/form/text-field";

export const { fieldContext, useFieldContext, formContext, useFormContext } =
  createFormHookContexts();

const formHook = createFormHook({
  fieldComponents: {
    TextField,
    TextAreaField,
    NullableTextAreaField,
    SelectField,
    CheckboxField,
    SliderField,
    SwitchField,
    NumberField,
    NullableNumberField,
    DateField,
  },
  formComponents: {
    SubscribeButton,
  },
  fieldContext,
  formContext,
});

export const { useAppForm, withForm, withFieldGroup } = formHook;
