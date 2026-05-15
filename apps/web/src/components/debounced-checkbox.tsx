"use client";

import { useEffect, useState } from "react";
import { useDebouncedCallback } from "@tanstack/react-pacer";

import { Checkbox } from "@board-games/ui/checkbox";

export function DebouncedCheckbox({
  onDebouncedChange,
  debounceDelay = 700,
  checked: checkedProp,
  ...props
}: React.ComponentProps<typeof Checkbox> & {
  onDebouncedChange?: (checked: boolean) => void;
  debounceDelay?: number;
}) {
  const [checked, setChecked] = useState(() => Boolean(checkedProp));

  useEffect(() => {
    setChecked(Boolean(checkedProp));
  }, [checkedProp]);

  const debouncedOnChange = useDebouncedCallback(
    (newChecked: boolean) => {
      onDebouncedChange?.(newChecked);
    },
    {
      wait: debounceDelay,
      onUnmount: (d) => {
        d.flush();
      },
    },
  );

  const handleChange = (newChecked: boolean) => {
    setChecked(newChecked);

    debouncedOnChange(newChecked);
  };

  return (
    <Checkbox {...props} checked={checked} onCheckedChange={handleChange} />
  );
}
