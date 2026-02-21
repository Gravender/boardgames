import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@board-games/ui/field";
import { Input } from "@board-games/ui/input";
import { cn } from "@board-games/ui/utils";

import { useFieldContext } from "~/hooks/form";

export const TextField = ({
  label,
  placeholder,
  type,
  description,
  disabled,
  hideLabel,
}: {
  label: string;
  placeholder?: string;
  type?: React.ComponentProps<"input">["type"];
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
      <Input
        id={field.name}
        name={field.name}
        type={type}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        aria-invalid={isInvalid}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
};
