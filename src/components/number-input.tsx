import { forwardRef, useEffect, useRef, useState } from "react";

import { cn } from "~/lib/utils";

import { Input } from "./ui/input";

interface NumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: number | null) => void;
  debounceTime?: number;
}
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ onValueChange, debounceTime = 500, value, className, ...props }, ref) => {
    const [internalValue, setInternalValue] = useState<string>(
      `${value?.toString() ?? ""}`,
    );
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      // Allow a single minus sign, single zero, or remove leading zeros for other numbers
      let validValue = value;
      if (value !== "-") {
        const numberPart = value.replace(/^-/, "");
        const trimmedNumber =
          numberPart === "0" ? "0" : numberPart.replace(/^0+/, "");
        validValue = value.startsWith("-")
          ? `-${trimmedNumber}`
          : trimmedNumber;
      }

      // Validate the input: allow empty string, single minus, or valid integer
      const isValid =
        validValue === "" || validValue === "-" || /^-?\d+$/.test(validValue);

      if (isValid) {
        const numericValue =
          validValue === "" || validValue === "-"
            ? null
            : parseFloat(validValue);
        if ((numericValue ?? 0) > 10000000000000) return;
        if ((numericValue ?? 0) < -10000000000000) return;

        setInternalValue(validValue);

        // Call the original onChange if it exists
        props.onChange?.(e);

        // Debounce the onValueChange call
        if (onValueChange) {
          onValueChange(numericValue);
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
          debounceTimerRef.current = setTimeout(() => {
            if (validValue === "") {
              setInternalValue("0");
            }
          }, debounceTime);
        }
      }
    };

    useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        className={cn(
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className,
        )}
        pattern="-?[0-9]*"
        value={internalValue}
        onChange={handleChange}
      />
    );
  },
);

NumberInput.displayName = "NumberInput";
