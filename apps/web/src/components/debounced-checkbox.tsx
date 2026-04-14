"use client";

import { useState } from "react";
import { useDebouncedCallback } from "@tanstack/react-pacer";

import { Checkbox } from "@board-games/ui/checkbox";

export function DebouncedCheckbox({
  onDebouncedChange,
  debounceDelay = 700,
  ...props
}: React.ComponentProps<typeof Checkbox> & {
  onDebouncedChange?: (checked: boolean) => void;
  debounceDelay?: number;
}) {
  const [checked, setChecked] = useState(props.checked);

  const debouncedOnChange = useDebouncedCallback(
    (newChecked: boolean) => {
      onDebouncedChange?.(newChecked);
    },
    { wait: debounceDelay },
  );

  const handleChange = (newChecked: boolean) => {
    setChecked(newChecked);

    debouncedOnChange(newChecked);
  };

  return (
    <Checkbox {...props} checked={checked} onCheckedChange={handleChange} />
  );
}
