"use client";

import { AlertTriangle, Check, XIcon } from "lucide-react";

import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { cn } from "@board-games/ui/utils";

import { useFormContext } from "~/hooks/form";

import { useShareGameData } from "./share-game-data-context";
import { ShareSummaryCompactBlock } from "./share-summary-compact";
import {
  deriveShareSummary,
  deriveShareSummaryCompact,
} from "./share-summary-derive";
import type { FriendRow } from "./types";
import type { ShareGameForm } from "./use-share-game-form";

const Row = ({ label, ok }: { label: string; ok: boolean }) => (
  <div className="flex items-center justify-between gap-2 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="flex items-center gap-1 font-medium">
      {ok ? (
        <>
          <Check className="size-4 text-emerald-600" aria-hidden />
          Yes
        </>
      ) : (
        <>
          <XIcon className="size-4 text-muted-foreground" aria-hidden />
          No
        </>
      )}
    </span>
  </div>
);

type ShareSummaryPanelProps = {
  onSendRequest: () => void;
  friends: FriendRow[];
  className?: string;
};

export const ShareSummaryPanel = ({
  onSendRequest,
  friends,
  className,
}: ShareSummaryPanelProps) => {
  const form = useFormContext() as unknown as ShareGameForm;
  const gameData = useShareGameData();

  return (
    <form.Subscribe selector={(s) => s.values}>
      {(values) => {
        const d = deriveShareSummary(values, gameData);
        const compact = deriveShareSummaryCompact(values, gameData, friends);
        return (
          <Card className={cn("border-border shadow-sm", className)}>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
              <CardDescription>
                Live summary of this share request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ShareSummaryCompactBlock compact={compact} />
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                  Checklist
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Recipients: </span>
                  <span className="font-medium">{d.recipientCount}</span>
                </p>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Included
                  </p>
                  <Row label="Game" ok />
                  <Row label="Roles" ok={d.rolesIncluded} />
                  <Row label="Scoresheets" ok={d.scoresheetsIncluded} />
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">
                      Matches selected
                    </span>
                    <span className="font-medium tabular-nums">
                      {d.selectedMatchCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">
                      Matches with players
                    </span>
                    <span className="font-medium tabular-nums">
                      {d.matchesWithPlayersCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">
                      Matches with locations
                    </span>
                    <span className="font-medium tabular-nums">
                      {d.matchesWithLocationsCount}
                    </span>
                  </div>
                </div>
              </div>
              {d.showPlayersWarning ? (
                <div
                  className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
                  role="status"
                >
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden
                  />
                  <span>Some matches are shared without players.</span>
                </div>
              ) : null}
              {d.showMatchPlayerWithoutPlayerWarning ? (
                <div
                  className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
                  role="status"
                >
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden
                  />
                  <span>
                    A match player seat is shared, but that person is not shared
                    under Players (scoresheets). Share the player there or turn
                    off their match seat so identity lines up.
                  </span>
                </div>
              ) : null}
            </CardContent>
            <CardFooter>
              <Button type="button" className="w-full" onClick={onSendRequest}>
                Send Share Request
              </Button>
            </CardFooter>
          </Card>
        );
      }}
    </form.Subscribe>
  );
};
