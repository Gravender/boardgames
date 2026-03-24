"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";

import type { RouterOutputs } from "@board-games/api";
import { Label } from "@board-games/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import { cn } from "@board-games/ui/utils";

export type RivalsData = RouterOutputs["newPlayer"]["getPlayerTopRivals"];
export type TeammatesData = RouterOutputs["newPlayer"]["getPlayerTopTeammates"];

export type RivalRow = RivalsData["rivals"][number];
export type TeammateRow = TeammatesData["teammates"][number];

export const ALL_GAMES_VALUE = "all";

type WithByGame = {
  byGame: readonly { gameIdKey: string; gameName: string }[];
};

export const useGameFilterOptions = <T extends WithByGame>(items: T[]) => {
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      for (const g of item.byGame) {
        map.set(g.gameIdKey, g.gameName);
      }
    }
    return [...map.entries()].toSorted((a, b) => a[1].localeCompare(b[1]));
  }, [items]);
};

export const StatBlock = ({
  label,
  value,
  title: titleAttr,
}: {
  label: string;
  value: ReactNode;
  title?: string;
}) => (
  <div
    className="border-border/50 bg-background/60 rounded-lg border px-2.5 py-2"
    title={titleAttr}
  >
    <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
      {label}
    </p>
    <div className="text-foreground mt-0.5 text-sm font-semibold tabular-nums">
      {value}
    </div>
  </div>
);

export const useRivalGameFilterOptions = (rivals: RivalRow[]) =>
  useGameFilterOptions(rivals);

export const useTeammateGameFilterOptions = (teammates: TeammateRow[]) =>
  useGameFilterOptions(teammates);

export const getRivalDisplayStats = (
  r: RivalRow,
  gameFilter: string,
): {
  matches: number;
  winsVs: number;
  lossesVs: number;
  tiesVs: number;
  winRateVs: number;
  recentDelta: number;
} => {
  if (gameFilter === ALL_GAMES_VALUE) {
    return {
      matches: r.matches,
      winsVs: r.winsVs,
      lossesVs: r.lossesVs,
      tiesVs: r.tiesVs,
      winRateVs: r.winRateVs,
      recentDelta: r.recentDelta,
    };
  }
  const g = r.byGame.find((x) => x.gameIdKey === gameFilter);
  if (!g) {
    return {
      matches: 0,
      winsVs: 0,
      lossesVs: 0,
      tiesVs: 0,
      winRateVs: 0,
      recentDelta: 0,
    };
  }
  return {
    matches: g.matches,
    winsVs: g.winsVs,
    lossesVs: g.lossesVs,
    tiesVs: g.tiesVs,
    winRateVs: g.winRateVs,
    // Prefer API per-game recentDelta; fallback matches aggregate formula (wins − losses).
    recentDelta: g.recentDelta ?? g.winsVs - g.lossesVs,
  };
};

/** Positive = profile player finished better on average (lower placement is better). */
export const formatPlacementAdvantage = (value: number | null): string => {
  if (value === null) {
    return "—";
  }
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) {
    return `+${rounded}`;
  }
  return String(rounded);
};

export const getRivalRivalryMeta = (
  r: RivalRow,
  gameFilter: string,
): {
  secondsPlayedTogether: number;
  competitiveMatches: number;
  secondsPlayedCompetitiveTogether: number;
  avgPlacementAdvantage: number | null;
} => {
  if (gameFilter === ALL_GAMES_VALUE) {
    return {
      secondsPlayedTogether: r.secondsPlayedTogether,
      competitiveMatches: r.competitiveMatches,
      secondsPlayedCompetitiveTogether: r.secondsPlayedCompetitiveTogether,
      avgPlacementAdvantage: r.avgPlacementAdvantage,
    };
  }
  const g = r.byGame.find((x) => x.gameIdKey === gameFilter);
  if (!g) {
    return {
      secondsPlayedTogether: 0,
      competitiveMatches: 0,
      secondsPlayedCompetitiveTogether: 0,
      avgPlacementAdvantage: null,
    };
  }
  return {
    secondsPlayedTogether: g.secondsPlayedTogether,
    competitiveMatches: g.competitiveMatches,
    secondsPlayedCompetitiveTogether: g.secondsPlayedCompetitiveTogether,
    avgPlacementAdvantage: g.avgPlacementAdvantage,
  };
};

export const getTeammateDisplayStats = (
  t: TeammateRow,
  gameFilter: string,
): {
  matchesTogether: number;
  winsTogether: number;
  nonWinsTogether: number;
  winRateTogether: number;
} => {
  if (gameFilter === ALL_GAMES_VALUE) {
    return {
      matchesTogether: t.matchesTogether,
      winsTogether: t.winsTogether,
      nonWinsTogether: t.nonWinsTogether,
      winRateTogether: t.winRateTogether,
    };
  }
  const g = t.byGame.find((x) => x.gameIdKey === gameFilter);
  if (!g) {
    return {
      matchesTogether: 0,
      winsTogether: 0,
      nonWinsTogether: 0,
      winRateTogether: 0,
    };
  }
  return {
    matchesTogether: g.matchesTogether,
    winsTogether: g.winsTogether,
    nonWinsTogether: g.nonWinsTogether,
    winRateTogether: g.winRateTogether,
  };
};

type SocialGameFilterSelectProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: [string, string][];
  className?: string;
};

export const SocialGameFilterSelect = ({
  id,
  label,
  value,
  onValueChange,
  options,
  className,
}: SocialGameFilterSelectProps) => {
  if (options.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="All games" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_GAMES_VALUE}>All games (totals)</SelectItem>
          {options.map(([gameIdKey, gameName]) => (
            <SelectItem key={gameIdKey} value={gameIdKey}>
              {gameName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
