"use client";

import Link from "next/link";
import { Clock, Gamepad2, Medal, Share2, Trophy } from "lucide-react";
import { useSuspenseQueries } from "@tanstack/react-query";

import { formatDuration } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Card, CardContent } from "@board-games/ui/card";
import { cn } from "@board-games/ui/utils";

import { PlayerImage } from "~/components/player-image";
import { useTRPC } from "~/trpc/react";

import type { PlayerInsightsPageInput } from "./player-insights-types";

export function PlayerInsightsHeroSection({
  playerInput,
}: {
  playerInput: PlayerInsightsPageInput;
}) {
  const trpc = useTRPC();
  const [{ data: header }, { data: summary }] = useSuspenseQueries({
    queries: [
      trpc.newPlayer.getPlayerHeader.queryOptions(playerInput),
      trpc.newPlayer.getPlayerSummary.queryOptions(playerInput),
    ],
  });

  const shareHref =
    playerInput.type === "original"
      ? `/dashboard/players/${playerInput.id}/share`
      : null;

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
                <span className="text-muted-foreground text-xs">
                  Player insights
                </span>
              </div>
            </div>
          </div>

          {shareHref !== null && (
            <div className="flex shrink-0 justify-center md:justify-end">
              <Button variant="ghost" size="icon" className="size-9" asChild>
                <Link href={shareHref} aria-label="Share player profile">
                  <Share2 className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
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
    </Card>
  );
}
