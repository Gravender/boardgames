"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Gamepad2, Medal, Pencil, Share2, Trophy } from "lucide-react";
import type { RouterOutputs } from "@board-games/api";
import { formatDuration } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { buttonVariants } from "@board-games/ui/components/button-variants";
import { Card, CardContent } from "@board-games/ui/card";
import { Dialog } from "@board-games/ui/dialog";
import { cn } from "@board-games/ui/utils";

import {
  EditPlayerDialog,
  type EditPlayerDialogPlayer,
} from "~/components/player/EditPlayerDialog";
import { PlayerImage } from "~/components/player-image";
import { usePlayerInsightsPageData } from "./player-insights-data-context";

import type { PlayerInsightsPageInput } from "./player-insights-types";

type PlayerHeader = RouterOutputs["newPlayer"]["stats"]["getPlayerHeader"];

const headerToEditPlayer = (header: PlayerHeader): EditPlayerDialogPlayer => {
  if (header.type === "original") {
    return {
      type: "original",
      id: header.id,
      name: header.name,
      image: header.image,
    };
  }
  return {
    type: "shared",
    sharedPlayerId: header.sharedPlayerId,
    name: header.name,
    image: header.image,
    permissions: header.permissions,
  };
};

export function PlayerInsightsHeroSection({
  playerInput,
}: {
  playerInput: PlayerInsightsPageInput;
}) {
  const { header, summary } = usePlayerInsightsPageData();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const shareHref =
    playerInput.type === "original"
      ? `/dashboard/players/${playerInput.id}/share`
      : null;

  const canEdit =
    header.type === "original" ||
    (header.type === "shared" && header.permissions === "edit");

  const glanceItems = [
    {
      label: "Win rate",
      ariaLabel: `Win rate: ${Math.round(summary.winRate)} percent`,
      value: `${Math.round(summary.winRate)}%`,
      icon: Trophy,
      iconClass: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Finished",
      ariaLabel: `Finished matches: ${summary.finishedMatches}`,
      value: String(summary.finishedMatches),
      icon: Medal,
      iconClass: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Wins",
      ariaLabel: `Wins: ${summary.wins}`,
      value: String(summary.wins),
      icon: Medal,
      iconClass: "text-amber-700 dark:text-amber-300",
    },
    {
      label: "Games",
      ariaLabel: `Games played: ${summary.gamesPlayed}`,
      value: String(summary.gamesPlayed),
      icon: Gamepad2,
      iconClass: "text-sky-600 dark:text-sky-400",
    },
    {
      label: "Play time",
      ariaLabel: `Total play time: ${formatDuration(summary.totalPlaytime)}`,
      value: formatDuration(summary.totalPlaytime),
      icon: Clock,
      iconClass: "text-teal-600 dark:text-teal-400",
    },
  ];

  return (
    <Card
      className={cn(
        "border-border/70 bg-card/75 overflow-hidden border shadow-md backdrop-blur-md",
        "ring-foreground/5 ring-1",
      )}
    >
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 px-4 pt-4 pb-3 md:flex-row md:items-center md:justify-between md:gap-4 md:px-5 md:pt-4 md:pb-3">
          <div className="flex flex-col items-center gap-3 min-w-0 md:flex-row md:items-center md:gap-4">
            <PlayerImage
              className="ring-amber-900/20 size-20 shrink-0 ring-2 md:size-24"
              image={header.image}
              alt={header.name}
            />

            <div className="min-w-0 flex-1 text-center md:text-left">
              <h1
                className={cn(
                  "text-foreground text-2xl font-semibold tracking-tight md:text-3xl md:leading-snug",
                  "font-(family-name:--font-insights-display)",
                )}
              >
                {header.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 md:justify-start">
                {header.type === "original" && header.isUser && (
                  <Badge variant="secondary" className="text-xs">
                    You
                  </Badge>
                )}
                {header.type === "shared" && (
                  <Badge variant="outline" className="text-xs">
                    Shared
                    {header.permissions === "edit" ? " · edit" : " · view"}
                  </Badge>
                )}
                <span className="text-muted-foreground text-xs">Stats</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 md:justify-end">
            {canEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setIsEditOpen(true)}
                aria-label={`Edit ${header.name}`}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit
              </Button>
            )}
            {shareHref !== null && (
              <Link
                href={shareHref}
                aria-label="Share player profile"
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon",
                  className: "size-9",
                })}
              >
                <Share2 className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        <section
          className="border-border/50 border-t px-4 py-3 md:px-5 md:py-3.5"
          aria-label="At a glance"
        >
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
            {glanceItems.map((item) => (
              <li
                key={item.label}
                className="border-border/50 bg-background/60 hover:bg-background/80 rounded-lg border px-2.5 py-2.5 transition-colors md:px-3 md:py-2.5"
                aria-label={item.ariaLabel}
              >
                <div className="flex items-center gap-1.5">
                  <item.icon
                    className={cn("h-3.5 w-3.5 shrink-0", item.iconClass)}
                    aria-hidden
                  />
                  <span className="text-muted-foreground text-[0.65rem] font-medium uppercase tracking-wide">
                    {item.label}
                  </span>
                </div>
                <p className="text-foreground mt-1 text-lg font-semibold tabular-nums tracking-tight md:text-xl">
                  {item.value}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </CardContent>

      {canEdit && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <EditPlayerDialog
            player={headerToEditPlayer(header)}
            setOpen={setIsEditOpen}
          />
        </Dialog>
      )}
    </Card>
  );
}
