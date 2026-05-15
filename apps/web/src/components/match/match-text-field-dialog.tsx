"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { z } from "zod/v4";

import { Button } from "@board-games/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@board-games/ui/dialog";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { cn } from "@board-games/ui/utils";

import { useAppForm } from "~/hooks/form";

const textFieldFormSchema = z.object({
  text: z.string(),
});

export type MatchTextFieldDialogProps = {
  /** When false, shows read-only collapsed surface (no dialog). */
  canEdit: boolean;
  /** Server text when the dialog session starts (collapsed display updates from parent). */
  serverValue: string | null;
  debounceMs: number;
  dialogTitle: ReactNode;
  /** Accessible name for the text field (sr-only label). */
  fieldLabel: string;
  rows?: number;
  /** Placeholder / empty collapsed hint */
  emptyLabel?: string;
  /** Persist trimmed text (empty string means cleared → map to null in caller if needed). */
  onSave: (normalizedTrimmed: string) => Promise<void>;
  isMutationPending: boolean;
  /** Optional offline hint above the field */
  showOfflineHint?: boolean;
  isOnline?: boolean;
  className?: string;
  collapsedClassName?: string;
  /** Merged onto the collapsed trigger `Button` (dialog open control). */
  triggerClassName?: string;
  /** When true, collapsed preview scrolls instead of line-clamping. */
  collapsedScrollable?: boolean;
  /** Max height class for the collapsed scroll area (when `collapsedScrollable`). */
  collapsedScrollMaxClass?: string;
  /** Merged onto `DialogContent` (e.g. max width / height for large editors). */
  dialogContentClassName?: string;
  /** Merged onto the dialog `Textarea` (e.g. responsive max height). */
  dialogTextareaClassName?: string;
};

/**
 * Collapsed “fake input” + dialog with a single textarea, debounced autosave via
 * TanStack Form **field-level** listeners (no refs).
 */
export function MatchTextFieldDialog({
  canEdit,
  serverValue,
  debounceMs,
  dialogTitle,
  fieldLabel,
  rows = 4,
  emptyLabel = "—",
  onSave,
  isMutationPending,
  showOfflineHint = false,
  isOnline = true,
  className,
  collapsedClassName,
  triggerClassName,
  collapsedScrollable = false,
  collapsedScrollMaxClass = "max-h-36",
  dialogContentClassName,
  dialogTextareaClassName,
}: MatchTextFieldDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogSession, setDialogSession] = useState(0);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setDialogSession((s) => s + 1);
    }
  };

  const displayText =
    serverValue && serverValue.trim() !== "" ? serverValue : emptyLabel;

  const collapsedBody = collapsedScrollable ? (
    <ScrollArea
      className={cn(
        "w-full min-h-0",
        // Fixed height so the viewport gets a real size; max-h alone often breaks Base UI scroll.
        collapsedScrollMaxClass,
      )}
    >
      <span className="text-foreground block w-full whitespace-pre-wrap wrap-break-word pr-1 text-sm leading-snug">
        {displayText}
      </span>
    </ScrollArea>
  ) : (
    <span className="line-clamp-3 w-full whitespace-pre-wrap wrap-break-word">
      {displayText}
    </span>
  );

  const collapsed = (
    <div
      className={cn(
        "bg-input/20 border-input text-foreground flex min-h-9 w-full items-start rounded-md border px-3 py-2 text-start text-sm shadow-xs",
        canEdit && "cursor-pointer",
        !canEdit && "text-muted-foreground",
        collapsedClassName,
      )}
    >
      {collapsedBody}
    </div>
  );

  if (!canEdit) {
    return <div className={className}>{collapsed}</div>;
  }

  return (
    <div className={className}>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "h-auto min-h-9 w-full justify-start p-0",
                triggerClassName,
              )}
              aria-label={`Edit ${typeof dialogTitle === "string" ? dialogTitle : fieldLabel}`}
            >
              {collapsed}
            </Button>
          }
        />
        <DialogContent className={dialogContentClassName}>
          <DialogEditorBody
            key={dialogSession}
            dialogTitle={dialogTitle}
            fieldLabel={fieldLabel}
            rows={rows}
            serverValue={serverValue}
            debounceMs={debounceMs}
            onSave={onSave}
            isMutationPending={isMutationPending}
            showOfflineHint={showOfflineHint}
            isOnline={isOnline}
            onRequestClose={() => handleOpenChange(false)}
            textareaClassName={dialogTextareaClassName}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DialogEditorBody({
  dialogTitle,
  fieldLabel,
  rows,
  serverValue,
  debounceMs,
  onSave,
  isMutationPending,
  showOfflineHint,
  isOnline,
  onRequestClose,
  textareaClassName,
}: {
  dialogTitle: ReactNode;
  fieldLabel: string;
  rows: number;
  serverValue: string | null;
  debounceMs: number;
  onSave: (normalizedTrimmed: string) => Promise<void>;
  isMutationPending: boolean;
  showOfflineHint: boolean;
  isOnline: boolean;
  onRequestClose: () => void;
  textareaClassName?: string;
}) {
  const initial = serverValue ?? "";
  const initialTrimmed = initial.trim();
  const [lastSaved, setLastSaved] = useState(initialTrimmed);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!savedFlash) {
      return;
    }
    const t = window.setTimeout(() => {
      setSavedFlash(false);
    }, 2000);
    return () => {
      window.clearTimeout(t);
    };
  }, [savedFlash]);

  const fieldListeners = useMemo(
    () => ({
      onChangeDebounceMs: debounceMs,
      onChange: ({ fieldApi }: { fieldApi: { state: { value: string } } }) => {
        if (!isOnline) {
          return;
        }
        const trimmed = fieldApi.state.value.trim();
        if (trimmed === lastSaved) {
          return;
        }
        void (async () => {
          try {
            await onSave(trimmed);
            setLastSaved(trimmed);
            setSaveError(null);
            setSavedFlash(true);
          } catch (e) {
            setSaveError(e instanceof Error ? e : new Error(String(e)));
          }
        })();
      },
    }),
    [debounceMs, isOnline, lastSaved, onSave],
  );

  const form = useAppForm({
    defaultValues: { text: initial },
    validators: {
      onChange: textFieldFormSchema,
    },
  });

  const handleDone = useCallback(async () => {
    const trimmed = form.getFieldValue("text").trim();
    try {
      setSaveError(null);
      await onSave(trimmed);
      setLastSaved(trimmed);
      setSavedFlash(true);
      onRequestClose();
    } catch (e) {
      setSaveError(e instanceof Error ? e : new Error(String(e)));
    }
  }, [form, onRequestClose, onSave]);

  const handleCancel = useCallback(() => {
    form.reset({ text: serverValue ?? "" });
    setLastSaved((serverValue ?? "").trim());
    setSaveError(null);
    onRequestClose();
  }, [form, onRequestClose, serverValue]);

  const handleRetry = useCallback(() => {
    const trimmed = form.getFieldValue("text").trim();
    void (async () => {
      try {
        setSaveError(null);
        await onSave(trimmed);
        setLastSaved(trimmed);
        setSavedFlash(true);
      } catch (e) {
        setSaveError(e instanceof Error ? e : new Error(String(e)));
      }
    })();
  }, [form, onSave]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{dialogTitle}</DialogTitle>
      </DialogHeader>
      <form.AppForm>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          {showOfflineHint && !isOnline ? (
            <p className="text-muted-foreground text-sm" role="status">
              You appear to be offline. Changes will retry when you are back
              online.
            </p>
          ) : null}
          <form.AppField name="text" listeners={fieldListeners}>
            {(f) => (
              <f.TextAreaField
                label={fieldLabel}
                hideLabel
                rows={rows}
                textareaClassName={textareaClassName}
              />
            )}
          </form.AppField>
          <form.Subscribe selector={(s) => s.values.text}>
            {(text) => {
              const trimmedDraft = text.trim();
              const isDirty = trimmedDraft !== lastSaved;
              let statusLabel: string | null = null;
              if (saveError) {
                statusLabel = null;
              } else if (isMutationPending) {
                statusLabel = "Saving…";
              } else if (savedFlash && !isDirty) {
                statusLabel = "Saved";
              } else if (isDirty && isOnline) {
                statusLabel = "Unsaved changes";
              }
              return (
                <div className="text-muted-foreground flex min-h-6 flex-wrap items-center gap-2 text-sm">
                  {saveError ? (
                    <>
                      <span className="text-destructive">
                        {saveError.message}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRetry}
                      >
                        Retry
                      </Button>
                    </>
                  ) : (
                    <span role="status">{statusLabel}</span>
                  )}
                </div>
              );
            }}
          </form.Subscribe>
        </form>
      </form.AppForm>
      <DialogFooter className="flex gap-2">
        <Button
          variant="secondary"
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={handleCancel}
        >
          Cancel
        </Button>
        <Button type="button" onClick={() => void handleDone()}>
          Done
        </Button>
      </DialogFooter>
    </>
  );
}
