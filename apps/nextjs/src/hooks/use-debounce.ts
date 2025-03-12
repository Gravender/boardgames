import { useEffect, useMemo, useRef, useState } from "react";
import { debounce } from "lodash";

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
  delay?: number,
) {
  const [value, setValue] = useState(defaultValue);
  const debouncedValue = useDebounce(value, delay ?? 500);

  useEffect(() => {
    if (debouncedValue === defaultValue || debouncedValue === undefined) return;
    updateValue(debouncedValue);
  }, [debouncedValue, defaultValue, updateValue]);

  return [value, setValue] as const;
}
export const useDebouncedCallback = (callback: () => void, delay?: number) => {
  const ref = useRef(callback);

  useEffect(() => {
    ref.current = callback;
  }, [callback]);

  const debouncedCallback = useMemo(() => {
    const func = () => {
       
      ref.current();
    };
    // eslint-disable-next-line react-compiler/react-compiler
    return debounce(func, delay ?? 1000);
  }, [delay]);

  return debouncedCallback;
};
