"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@board-games/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";

import { useFormContext } from "~/hooks/form";

import { useShareGameData } from "./share-game-data-context";
import { ShareSummaryCompactBlock } from "./share-summary-compact";
import {
  deriveShareSummary,
  deriveShareSummaryCompact,
} from "./share-summary-derive";
import type { FriendRow } from "./types";
import type { ShareGameForm } from "./use-share-game-form";

type ShareRequestConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  gameName: string;
  friends: FriendRow[];
};

export const ShareRequestConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  gameName,
  friends,
}: ShareRequestConfirmDialogProps) => {
  const form = useFormContext() as unknown as ShareGameForm;
  const gameData = useShareGameData();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(90vh,560px)] w-[min(100%,24rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-4 pt-4 pb-3">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Sharing game
          </p>
          <DialogTitle className="text-left text-base leading-snug">
            {gameName}
          </DialogTitle>
          <DialogDescription className="text-left">
            Review what will be included, then confirm to send the request.
          </DialogDescription>
        </DialogHeader>

        <form.Subscribe selector={(s) => s.values}>
          {(values) => {
            const compact = deriveShareSummaryCompact(
              values,
              gameData,
              friends,
            );
            const d = deriveShareSummary(values, gameData);
            return (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                  <div className="space-y-3">
                    <ShareSummaryCompactBlock
                      compact={compact}
                      variant="dialog"
                    />
                    <div className="text-muted-foreground grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md border border-border/80 bg-muted/25 px-2.5 py-2 text-[10px] leading-snug">
                      <span className="text-foreground font-medium">
                        Recipients
                      </span>
                      <span className="tabular-nums">{d.recipientCount}</span>
                      <span className="text-foreground font-medium">
                        Matches
                      </span>
                      <span className="tabular-nums">
                        {d.selectedMatchCount}
                      </span>
                    </div>
                    {d.showPlayersWarning ? (
                      <div
                        className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-950 dark:text-amber-100"
                        role="status"
                      >
                        <AlertTriangle
                          className="mt-0.5 size-3.5 shrink-0"
                          aria-hidden
                        />
                        <span>Some matches are shared without players.</span>
                      </div>
                    ) : null}
                    {d.showMatchPlayerWithoutPlayerWarning ? (
                      <div
                        className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-950 dark:text-amber-100"
                        role="status"
                      >
                        <AlertTriangle
                          className="mt-0.5 size-3.5 shrink-0"
                          aria-hidden
                        />
                        <span>
                          A match player seat is shared, but that person is not
                          shared under Players (scoresheets). Share the player
                          there or turn off their match seat so identity lines
                          up.
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
                <DialogFooter className="bg-background/95 shrink-0 gap-2 border-t border-border px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:flex sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      onConfirm();
                      onOpenChange(false);
                    }}
                  >
                    Confirm and send
                  </Button>
                </DialogFooter>
              </>
            );
          }}
        </form.Subscribe>
      </DialogContent>
    </Dialog>
  );
};
