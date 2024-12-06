import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number) {
  // State and setters for debounced value
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
export function useDebouncedInput<T>(
  defaultValue: T | undefined,
  updateValue: (value: T) => void,
  delay?: number | undefined,
) {
  const [value, setValue] = useState(defaultValue);
  const debouncedValue = useDebounce(value, delay ?? 500);

  useEffect(() => {
    if (debouncedValue === defaultValue || debouncedValue === undefined) return;
    updateValue(debouncedValue);
  }, [debouncedValue]);

  return [value, setValue] as const;
}
