import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@board-games/ui/field";
import { Slider } from "@board-games/ui/slider";

import { useFieldContext } from "~/hooks/form";

export const SliderField = ({
  label,
  min = 0,
  max = 100,
  step = 1,
  description,
  disabled,
}: {
  label: string;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  disabled?: boolean;
}) => {
  const field = useFieldContext<number[]>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field data-invalid={isInvalid}>
      <div className="flex items-center justify-between">
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        <span className="text-muted-foreground text-sm">
          {field.state.value.join(" - ")}
        </span>
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
      <Slider
        id={field.name}
        value={field.state.value}
        min={min}
        max={max}
        step={step}
        onValueChange={(value) => field.handleChange(value)}
        onBlur={field.handleBlur}
        aria-invalid={isInvalid}
        disabled={disabled}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
};
