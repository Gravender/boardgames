import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@board-games/ui/field";
import { Input } from "@board-games/ui/input";
import { cn } from "@board-games/ui/utils";

import { useFieldContext } from "~/hooks/form";

export const NumberField = ({
  label,
  placeholder,
  description,
  disabled,
  hideLabel,
}: {
  label: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  hideLabel?: boolean;
}) => {
  const field = useFieldContext<number>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name} className={cn(hideLabel && "sr-only")}>
        {label}
      </FieldLabel>
      {description && <FieldDescription>{description}</FieldDescription>}
      <Input
        id={field.name}
        name={field.name}
        type="number"
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(Number(e.target.value))}
        aria-invalid={isInvalid}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
};

export const NullableNumberField = ({
  label,
  placeholder,
  description,
  disabled,
  hideLabel,
}: {
  label: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  hideLabel?: boolean;
}) => {
  const field = useFieldContext<number | null>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name} className={cn(hideLabel && "sr-only")}>
        {label}
      </FieldLabel>
      {description && <FieldDescription>{description}</FieldDescription>}
      <Input
        id={field.name}
        name={field.name}
        type="number"
        value={field.state.value ?? ""}
        onBlur={field.handleBlur}
        onChange={(e) =>
          field.handleChange(
            e.target.value === "" ? null : parseInt(e.target.value),
          )
        }
        aria-invalid={isInvalid}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
};
