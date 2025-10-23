import { forwardRef, useEffect, useState } from "react";

import { Input } from "@board-games/ui/input";
import { cn } from "@board-games/ui/utils";

import { useDebounce } from "~/hooks/use-debounce";

interface NumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  defaultValue?: string | number;
  onValueChange?: (value: number | null) => void;
  debounceTime?: number;
}
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    { defaultValue, onValueChange, debounceTime = 700, className, ...props },
    ref,
  ) => {
    const [internalValue, setInternalValue] = useState<string>(
      `${defaultValue?.toString() ?? ""}`,
    );

    const debouncedOnChange = useDebounce((value: number | null) => {
      onValueChange?.(value);
    }, debounceTime);

    const validateValue = (value: string) => {
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
      const numericValue =
        validValue === "" || validValue === "-" ? null : parseFloat(validValue);
      return {
        parsedValue: numericValue,
        isValid,
      };
    };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInternalValue(value);

      const { isValid, parsedValue } = validateValue(value);

      if (isValid) {
        debouncedOnChange(parsedValue);
      }
    };
    const handleBlur = () => {
      const { isValid, parsedValue } = validateValue(internalValue);
      if (isValid) {
        debouncedOnChange(parsedValue);
      }
    };

    useEffect(() => {
      if (defaultValue !== undefined) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setInternalValue(defaultValue.toString());
      }
    }, [defaultValue]);

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        className={cn(
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          className,
        )}
        pattern="-?[0-9]*"
        value={internalValue}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    );
  },
);

NumberInput.displayName = "NumberInput";
