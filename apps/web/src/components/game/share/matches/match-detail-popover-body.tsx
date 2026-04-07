"use client";

import { format } from "date-fns";
import type { LucideIcon } from "lucide-react";
import { Activity, Clock, MapPin, Timer, Trophy, Users } from "lucide-react";

import { Separator } from "@board-games/ui/separator";
import { cn } from "@board-games/ui/utils";

import {
  MatchOutcomePlacementIcons,
  matchResultWinnerSurfaceClass,
} from "~/components/match/match-result-outcome";
import { PlayerImage } from "~/components/player-image";

import type { MatchShareGroupedDetail } from "../share-match-detail";

type SessionMeta = {
  date: Date;
  durationMinutes: number;
  locationName?: string | null;
  playerCount: number;
  finished: boolean;
};

const MetaRow = ({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex gap-2 sm:gap-2.5">
    <Icon
      className="text-muted-foreground mt-0.5 size-3.5 shrink-0 sm:size-4"
      aria-hidden
    />
    <div className="min-w-0 flex-1">
      <p className="text-muted-foreground text-[9px] font-medium tracking-wide uppercase sm:text-[10px]">
        {label}
      </p>
      <div className="text-foreground text-xs leading-snug sm:text-[13px]">
        {children}
      </div>
    </div>
  </div>
);

export const MatchDetailPopoverBody = ({
  detail,
  sessionMeta,
}: {
  detail: MatchShareGroupedDetail;
  sessionMeta?: SessionMeta;
}) => {
  const { summaryLines, winCondition, showScores, isManual, orderedItems } =
    detail;

  return (
    <div className="space-y-2 sm:space-y-4">
      <div className="bg-muted/50 text-muted-foreground rounded-lg border border-border/90 px-2.5 py-2 text-xs leading-relaxed shadow-sm sm:rounded-xl sm:px-3.5 sm:py-3">
        {sessionMeta ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3">
            <MetaRow icon={Activity} label="Session">
              {sessionMeta.finished ? "Finished" : "In progress"}
            </MetaRow>
            <MetaRow icon={Clock} label="Played">
              <span className="max-sm:hidden">
                {format(sessionMeta.date, "PPP")}
              </span>
              <span className="sm:hidden">
                {format(sessionMeta.date, "MMM d, yyyy")}
              </span>
            </MetaRow>
            <MetaRow icon={Timer} label="Duration">
              {sessionMeta.durationMinutes} min
            </MetaRow>
            <MetaRow icon={Users} label="Players">
              {sessionMeta.playerCount}
            </MetaRow>
            <div className="sm:col-span-2">
              <MetaRow icon={MapPin} label="Location">
                {sessionMeta.locationName?.trim()
                  ? sessionMeta.locationName
                  : "No location recorded"}
              </MetaRow>
            </div>
          </div>
        ) : (
          summaryLines.map((line) => (
            <p key={line} className="text-xs sm:text-[13px]">
              {line}
            </p>
          ))
        )}
        <div className="border-border/60 mt-2 flex gap-1.5 border-t border-dashed pt-2 sm:mt-4 sm:gap-2 sm:pt-3">
          <Trophy
            className="text-muted-foreground mt-0.5 size-3.5 shrink-0 sm:size-4"
            aria-hidden
          />
          <p className="text-muted-foreground min-w-0 flex-1 text-[10px] leading-relaxed sm:text-[11px]">
            <span className="sr-only">Win condition: </span>
            Scoring:{" "}
            <span className="text-foreground font-semibold">
              {winCondition}
            </span>
          </p>
        </div>
      </div>

      <Separator className="bg-border/80" />

      <div className="flex flex-col gap-1.5 sm:gap-2">
        {orderedItems.map((item) => {
          if (item.kind === "team") {
            const { team } = item;
            return (
              <div
                key={`team-${team.teamId}`}
                data-testid="share-result-row-team"
                aria-label={`Team: ${team.name}, ${team.winner ? "Winner" : "Loser"}${team.placement ? `, ${team.placement} place` : ""}`}
                className={cn(
                  "rounded-lg border p-2.5 sm:p-4",
                  matchResultWinnerSurfaceClass(team.winner),
                )}
              >
                <div className="flex items-center justify-between gap-2 pb-2 sm:pb-4">
                  <div className="flex min-h-5 min-w-0 items-center gap-1.5 sm:gap-2">
                    <Users
                      className="text-muted-foreground size-4 shrink-0 sm:h-5 sm:w-5"
                      aria-hidden
                    />
                    <h3 className="text-sm font-semibold sm:text-base">{`Team: ${team.name}`}</h3>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    {!isManual && showScores && team.teamRowScore != null ? (
                      <div className="text-xs font-medium tabular-nums sm:text-sm">
                        {team.teamRowScore} pts
                      </div>
                    ) : null}
                    <MatchOutcomePlacementIcons
                      placement={team.placement}
                      isManual={isManual}
                      isWinner={team.winner}
                    />
                  </div>
                </div>

                <ul className="flex max-h-24 flex-col flex-wrap gap-1.5 overflow-y-auto pl-1 sm:max-h-28 sm:gap-2 sm:pl-2">
                  {team.players.map((player) => (
                    <li
                      key={`${team.teamId}-${player.playerName}`}
                      className="flex items-center"
                    >
                      <PlayerImage
                        className="mr-2 h-7 w-7 sm:mr-3 sm:h-8 sm:w-8"
                        image={null}
                        alt={player.playerName}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium sm:text-base">
                          {player.playerName}
                        </p>
                        <p className="text-muted-foreground text-[11px] sm:text-xs">
                          {player.rankLabel} · {player.outcomeLabel}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {showScores && player.scoreDisplay != null ? (
                          <span className="text-muted-foreground text-xs tabular-nums sm:text-sm">
                            {player.scoreDisplay} pts
                          </span>
                        ) : null}
                        <MatchOutcomePlacementIcons
                          placement={player.placement}
                          isManual={isManual}
                          isWinner={player.isWinner === true}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }

          const { player } = item;
          return (
            <div
              key={`solo-${player.playerName}`}
              data-testid="share-result-row-solo"
              aria-label={`${player.playerName}, ${player.isWinner === true ? "Winner" : "Loser"}${player.placement ? `, ${player.placement} place` : ""}`}
              className={cn(
                "flex items-center rounded-lg border p-2 sm:p-3",
                matchResultWinnerSurfaceClass(player.isWinner === true),
              )}
            >
              <PlayerImage
                className="mr-2 h-7 w-7 shrink-0 sm:mr-4 sm:h-8 sm:w-8"
                image={null}
                alt={player.playerName}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium sm:text-base">
                  {player.playerName}
                </p>
                <p className="text-muted-foreground text-[11px] sm:text-xs">
                  {player.rankLabel} · {player.outcomeLabel}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                {showScores && player.scoreDisplay != null ? (
                  <div className="text-xs font-medium tabular-nums sm:text-sm">
                    {player.scoreDisplay} pts
                  </div>
                ) : null}
                <MatchOutcomePlacementIcons
                  placement={player.placement}
                  isManual={isManual}
                  isWinner={player.isWinner === true}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
