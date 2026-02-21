"use client";

import { Checkbox } from "@board-games/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@board-games/ui/field";

import { useFieldContext } from "~/hooks/form";

export const CheckboxField = ({
  label,
  description,
  disabled,
}: {
  label: string;
  description?: string;
  disabled?: boolean;
}) => {
  const field = useFieldContext<boolean>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field orientation="horizontal" data-invalid={isInvalid}>
      <Checkbox
        id={field.name}
        checked={field.state.value}
        onCheckedChange={(checked) => field.handleChange(checked === true)}
        onBlur={field.handleBlur}
        aria-invalid={isInvalid}
        disabled={disabled}
      />
      <FieldContent>
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
        {isInvalid && <FieldError errors={field.state.meta.errors} />}
      </FieldContent>
    </Field>
  );
};
