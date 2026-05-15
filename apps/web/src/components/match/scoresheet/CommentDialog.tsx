"use client";

import { useCallback, useId } from "react";

import { Button } from "@board-games/ui/button";
import { Label } from "@board-games/ui/label";
import { Textarea } from "@board-games/ui/textarea";
import { cn } from "@board-games/ui/utils";

import type { MatchInput } from "../types/input";
import { MATCH_COMMENT_AUTOSAVE_MS } from "~/hooks/match/autosave/constants";
import { useAutosaveTextField } from "~/hooks/match/autosave/use-autosave-text-field";
import { useNetworkOnline } from "~/hooks/match/autosave/use-network-online";
import { useUpdateMatchCommentMutation } from "~/hooks/mutations/match/scoresheet";

export function CommentDialog({
  matchInput,
  comment,
  canEdit,
}: {
  /** Canonical match key — must match `useMatch` / `getMatch` input so cache updates apply. */
  matchInput: MatchInput;
  comment: string | null;
  canEdit: boolean;
}) {
  const fieldId = useId();
  const online = useNetworkOnline();
  const { updateMatchCommentMutation } = useUpdateMatchCommentMutation();

  const save = useCallback(
    async (normalized: string) => {
      await updateMatchCommentMutation.mutateAsync({
        match: matchInput,
        comment: normalized === "" ? null : normalized,
      });
    },
    [matchInput, updateMatchCommentMutation],
  );

  const { draft, setDraft, dirty, status, error, flushAndSave, retry } =
    useAutosaveTextField({
      isActive: canEdit,
      initialText: comment ?? "",
      debounceMs: MATCH_COMMENT_AUTOSAVE_MS,
      save,
      autosaveEnabled: online,
    });

  const commentBlendClasses = cn(
    "border-transparent bg-transparent text-foreground shadow-none ring-0",
    "placeholder:text-muted-foreground/55",
    "transition-[border-color,box-shadow,background-color] duration-150",
    "focus-visible:border-input focus-visible:bg-card focus-visible:shadow-xs",
    "focus-visible:ring-2 focus-visible:ring-ring/25",
  );

  if (!canEdit) {
    const display = comment && comment.trim() !== "" ? comment : "No comment";
    return (
      <p className="text-muted-foreground whitespace-pre-wrap wrap-break-word text-sm">
        {display}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {!online ? (
        <p className="text-muted-foreground text-sm" role="status">
          You appear to be offline. Changes will save when you are back online.
        </p>
      ) : null}
      <Label htmlFor={fieldId} className="sr-only">
        Comment
      </Label>
      <Textarea
        id={fieldId}
        name="match-comment"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
        }}
        rows={4}
        aria-invalid={error !== null}
        className={cn(
          commentBlendClasses,
          error !== null &&
            "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30",
        )}
        placeholder="Add a match comment…"
      />
      <div className="text-muted-foreground flex min-h-7 items-end justify-between gap-2 text-sm">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {error ? (
            <span className="text-destructive max-w-full text-xs wrap-break-word">
              {error.message}
            </span>
          ) : null}
          {!error && status === "saving" ? (
            <span role="status">Saving…</span>
          ) : null}
          {!error && status === "saved" && !dirty ? (
            <span role="status">Saved</span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          {error ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!online}
              onClick={() => {
                void retry();
              }}
            >
              Retry
            </Button>
          ) : null}
          {dirty ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!online || updateMatchCommentMutation.isPending}
              onClick={() => {
                void flushAndSave();
              }}
            >
              Save
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
