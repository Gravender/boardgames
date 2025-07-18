import { useState } from "react";

import type { CheckboxPrimitive } from "@board-games/ui/checkbox";
import { Checkbox } from "@board-games/ui/checkbox";

import { useDebounce } from "~/hooks/use-debounce";

export function DebouncedCheckbox({
  onDebouncedChange,
  debounceDelay = 700,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  onDebouncedChange?: (checked: boolean) => void;
  debounceDelay?: number;
}) {
  const [checked, setChecked] = useState(props.checked);

  const debouncedOnChange = useDebounce((newChecked: boolean) => {
    onDebouncedChange?.(newChecked);
  }, debounceDelay);

  const handleChange = (newChecked: boolean) => {
    setChecked(newChecked);

    debouncedOnChange(newChecked);
  };

  return (
    <Checkbox {...props} checked={checked} onCheckedChange={handleChange} />
  );
}
