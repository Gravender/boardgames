"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@tanstack/react-pacer";

export type AutosaveTextFieldStatus =
  | "idle"
  | "debouncing"
  | "saving"
  | "saved"
  | "error";

export type UseAutosaveTextFieldOptions = {
  /** When true (e.g. dialog open), autosave runs; draft resets when this becomes true. */
  isActive: boolean;
  /** Server/source text when `isActive` becomes true. */
  initialText: string;
  debounceMs: number;
  /** Persist normalized text; throw on failure. */
  save: (normalizedText: string) => Promise<void>;
  /** Trim / collapse whitespace for compare + save. Empty string means cleared. */
  normalize?: (raw: string) => string;
  /** Browser `beforeunload` when there are unsaved edits (active + dirty). */
  warnBeforeUnloadWhenDirty?: boolean;
  /** When false, debounced autosave is skipped (draft still tracked). */
  autosaveEnabled?: boolean;
};

const defaultNormalize = (raw: string) => raw.trim();

/**
 * Debounced autosave for a single text field using `useDebouncedValue` + explicit save.
 * Flushes pending debounce on unmount via Pacer `onUnmount` (debouncer.flush).
 */
export const useAutosaveTextField = ({
  isActive,
  initialText,
  debounceMs,
  save,
  normalize = defaultNormalize,
  warnBeforeUnloadWhenDirty = true,
  autosaveEnabled = true,
}: UseAutosaveTextFieldOptions) => {
  const saveRef = useRef(save);
  saveRef.current = save;

  const [draft, setDraft] = useState(initialText);
  const [lastSavedNorm, setLastSavedNorm] = useState(() =>
    normalize(initialText),
  );
  const [status, setStatus] = useState<AutosaveTextFieldStatus>("idle");
  const [error, setError] = useState<Error | null>(null);

  const wasActiveRef = useRef(false);
  useEffect(() => {
    if (isActive && !wasActiveRef.current) {
      const init = initialText;
      setDraft(init);
      const norm = normalize(init);
      setLastSavedNorm(norm);
      setError(null);
      setStatus("idle");
    }
    wasActiveRef.current = isActive;
  }, [isActive, initialText, normalize]);

  const [debouncedDraft, debouncer] = useDebouncedValue(draft, {
    wait: debounceMs,
    onUnmount: (d) => {
      d.flush();
    },
  });

  const isPendingDebounce = draft !== debouncedDraft;

  const saveGenerationRef = useRef(0);

  useEffect(() => {
    if (!isActive || !autosaveEnabled) {
      return;
    }
    const norm = normalize(debouncedDraft);
    if (norm === lastSavedNorm) {
      return;
    }

    const gen = ++saveGenerationRef.current;
    setStatus("saving");
    setError(null);

    const run = async () => {
      try {
        await saveRef.current(norm);
        if (gen !== saveGenerationRef.current) {
          return;
        }
        setLastSavedNorm(norm);
        setStatus("saved");
      } catch (e) {
        if (gen !== saveGenerationRef.current) {
          return;
        }
        setError(e instanceof Error ? e : new Error(String(e)));
        setStatus("error");
      }
    };

    void run();
  }, [debouncedDraft, isActive, autosaveEnabled, lastSavedNorm, normalize]);

  const flushAndSave = useCallback(async () => {
    if (!autosaveEnabled) {
      return;
    }
    debouncer.flush();
    const norm = normalize(draft);
    if (norm === lastSavedNorm) {
      return;
    }
    saveGenerationRef.current += 1;
    const gen = saveGenerationRef.current;
    setStatus("saving");
    setError(null);
    try {
      await saveRef.current(norm);
      if (gen === saveGenerationRef.current) {
        setLastSavedNorm(norm);
        setStatus("saved");
      }
    } catch (e) {
      if (gen === saveGenerationRef.current) {
        setError(e instanceof Error ? e : new Error(String(e)));
        setStatus("error");
      }
      throw e;
    }
  }, [autosaveEnabled, debouncer, draft, lastSavedNorm, normalize]);

  const cancelPendingDebounce = useCallback(() => {
    debouncer.cancel();
  }, [debouncer]);

  const retry = useCallback(async () => {
    if (!autosaveEnabled) {
      return;
    }
    saveGenerationRef.current += 1;
    const gen = saveGenerationRef.current;
    const norm = normalize(draft);
    setStatus("saving");
    setError(null);
    try {
      await saveRef.current(norm);
      if (gen === saveGenerationRef.current) {
        setLastSavedNorm(norm);
        setStatus("saved");
      }
    } catch (e) {
      if (gen === saveGenerationRef.current) {
        setError(e instanceof Error ? e : new Error(String(e)));
        setStatus("error");
      }
    }
  }, [autosaveEnabled, draft, normalize]);

  const dirty = normalize(draft) !== lastSavedNorm;

  useEffect(() => {
    if (!warnBeforeUnloadWhenDirty || !isActive || !dirty) {
      return;
    }
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [warnBeforeUnloadWhenDirty, isActive, dirty]);

  const displayStatus: AutosaveTextFieldStatus =
    status === "error"
      ? "error"
      : status === "saving"
        ? "saving"
        : status === "saved"
          ? "saved"
          : isPendingDebounce && dirty
            ? "debouncing"
            : "idle";

  return {
    draft,
    setDraft,
    debouncedDraft,
    dirty,
    status: displayStatus,
    persistenceStatus: status,
    error,
    isPendingDebounce,
    flushAndSave,
    cancelPendingDebounce,
    retry,
  };
};
