import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@board-games/ui/field";
import { Textarea } from "@board-games/ui/textarea";
import { cn } from "@board-games/ui/utils";

import { useFieldContext } from "~/hooks/form";

export const TextAreaField = ({
  label,
  placeholder,
  rows,
  description,
  disabled,
  hideLabel,
}: {
  label: string;
  placeholder?: string;
  rows?: number;
  description?: string;
  disabled?: boolean;
  hideLabel?: boolean;
}) => {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name} className={cn(hideLabel && "sr-only")}>
        {label}
      </FieldLabel>
      {description && <FieldDescription>{description}</FieldDescription>}
      <Textarea
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        rows={rows}
        onChange={(e) => field.handleChange(e.target.value)}
        aria-invalid={isInvalid}
        placeholder={placeholder}
        disabled={disabled}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
};

export const NullableTextAreaField = ({
  label,
  placeholder,
  rows,
  description,
  disabled,
  hideLabel,
}: {
  label: string;
  placeholder?: string;
  rows?: number;
  description?: string;
  disabled?: boolean;
  hideLabel?: boolean;
}) => {
  const field = useFieldContext<string | null>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name} className={cn(hideLabel && "sr-only")}>
        {label}
      </FieldLabel>
      {description && <FieldDescription>{description}</FieldDescription>}
      <Textarea
        id={field.name}
        name={field.name}
        value={field.state.value ?? ""}
        onBlur={field.handleBlur}
        rows={rows}
        onChange={(e) =>
          field.handleChange(e.target.value === "" ? null : e.target.value)
        }
        aria-invalid={isInvalid}
        placeholder={placeholder}
        disabled={disabled}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
};
