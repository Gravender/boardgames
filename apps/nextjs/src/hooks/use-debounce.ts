"use client";

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
export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delay = 1000,
): (...args: Parameters<T>) => void {
  const ref = useRef(callback);

  useEffect(() => {
    ref.current = callback;
  }, [callback]);

  return useMemo(() => {
    return debounce((...args: Parameters<T>) => {
      ref.current(...args);
    }, delay);
  }, [delay]);
}
