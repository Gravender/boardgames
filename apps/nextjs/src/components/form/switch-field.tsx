import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@board-games/ui/field";
import { Switch } from "@board-games/ui/switch";

import { useFieldContext } from "~/hooks/form";

export const SwitchField = ({
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
      <FieldContent>
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
        {isInvalid && <FieldError errors={field.state.meta.errors} />}
      </FieldContent>
      <Switch
        id={field.name}
        checked={field.state.value}
        onCheckedChange={(checked) => field.handleChange(checked)}
        onBlur={field.handleBlur}
        aria-invalid={isInvalid}
        disabled={disabled}
      />
    </Field>
  );
};
