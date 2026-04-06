"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@board-games/ui/collapsible";
import { Input } from "@board-games/ui/input";
import { Label } from "@board-games/ui/label";
import { Progress } from "@board-games/ui/progress";
import { ScrollArea } from "@board-games/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import { cn } from "@board-games/ui/utils";

import { FormattedDate } from "~/components/formatted-date";
import { selectItemsFromPairs } from "@board-games/ui/lib/select-items";
import { PlayerImage } from "~/components/player-image";

import { insightPlayerProfileHref } from "../player-insights-match-links";
import {
  ALL_GAMES_VALUE,
  getTeammateDisplayStats,
  SocialGameFilterSelect,
  StatBlock,
  useTeammateGameFilterOptions,
} from "./PeopleSocialInsightsHelpers";
import { TeammatePerGameBreakdown } from "./social-by-game-breakdown";

type Teammates = RouterOutputs["player"]["stats"]["getPlayerTopTeammates"];

type MateSortKey =
  | "name"
  | "matchesTogether"
  | "winRateTogether"
  | "nonWinsTogether"
  | "uniqueGamesPlayed"
  | "lastPlayedAt";

const identityRowKey = (
  p: Teammates["teammates"][number]["teammate"],
): string => {
  return p.type === "original" ? `o-${p.id}` : `s-${p.sharedId}`;
};

const TEAMMATE_SORT_PRESETS: {
  key: MateSortKey;
  dir: "asc" | "desc";
  label: string;
}[] = [
  { key: "matchesTogether", dir: "desc", label: "Most co-op games" },
  { key: "winRateTogether", dir: "desc", label: "Highest co-op win %" },
  { key: "nonWinsTogether", dir: "desc", label: "Most not won" },
  { key: "uniqueGamesPlayed", dir: "desc", label: "Most distinct titles" },
  { key: "lastPlayedAt", dir: "desc", label: "Recently played" },
  { key: "name", dir: "asc", label: "Name (A–Z)" },
];

export function TeammatesTable({ data }: { data: Teammates }) {
  const [gameFilter, setGameFilter] = useState(ALL_GAMES_VALUE);
  const gameOptions = useTeammateGameFilterOptions(data.teammates);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<MateSortKey>("matchesTogether");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sortPresetValue = `${sortKey}:${sortDir}`;

  const teammateSortPresetItems = useMemo(
    () =>
      selectItemsFromPairs(
        TEAMMATE_SORT_PRESETS.map((p) => ({
          value: `${p.key}:${p.dir}`,
          label: p.label,
        })),
      ),
    [],
  );

  const handleSortPresetChange = (v: string | null) => {
    if (v === null) {
      return;
    }
    const [key, dir] = v.split(":") as [MateSortKey, "asc" | "desc"];
    setSortKey(key);
    setSortDir(dir);
  };

  const sorted = useMemo(() => {
    const base =
      gameFilter === ALL_GAMES_VALUE
        ? [...data.teammates]
        : data.teammates.filter((t) =>
            t.byGame.some((g) => g.gameIdKey === gameFilter),
          );
    const dir = sortDir === "asc" ? 1 : -1;
    base.sort((a, b) => {
      const sa = getTeammateDisplayStats(a, gameFilter);
      const sb = getTeammateDisplayStats(b, gameFilter);
      switch (sortKey) {
        case "name":
          return a.teammate.name.localeCompare(b.teammate.name) * dir;
        case "matchesTogether":
          return (sa.matchesTogether - sb.matchesTogether) * dir;
        case "winRateTogether":
          return (sa.winRateTogether - sb.winRateTogether) * dir;
        case "nonWinsTogether":
          return (sa.nonWinsTogether - sb.nonWinsTogether) * dir;
        case "uniqueGamesPlayed":
          if (gameFilter === ALL_GAMES_VALUE) {
            return (a.uniqueGamesPlayed - b.uniqueGamesPlayed) * dir;
          }
          return (sa.matchesTogether - sb.matchesTogether) * dir;
        case "lastPlayedAt": {
          const at = a.lastPlayedAt?.getTime() ?? 0;
          const bt = b.lastPlayedAt?.getTime() ?? 0;
          return (at - bt) * dir;
        }
        default:
          return 0;
      }
    });
    return base;
  }, [data.teammates, sortKey, sortDir, gameFilter]);

  const filteredBySearch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return sorted;
    }
    return sorted.filter((t) => t.teammate.name.toLowerCase().includes(q));
  }, [sorted, searchQuery]);

  if (data.teammates.length === 0) {
    return (
      <Card className="border-border/80 bg-card/70 border shadow-sm backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-lg">Teammates</CardTitle>
          <CardDescription>Co-op partners on your team.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No teammates yet. You need at least five co-op games on the same
            team with someone to appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 bg-card/70 border shadow-sm backdrop-blur-md">
      <CardHeader className="pb-2">
        <CardTitle
          className={cn(
            "text-xl font-semibold md:text-2xl",
            "font-(family-name:--font-insights-display)",
          )}
        >
          Teammates
        </CardTitle>
        <CardDescription>
          Summary for each partner, then a per-title breakdown of co-op stats
          across games you’ve played together.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-2 sm:px-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-2">
            <Label htmlFor="teammates-search" className="text-sm font-medium">
              Search
            </Label>
            <div className="relative">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="teammates-search"
                type="search"
                autoComplete="off"
                placeholder="Search by player name…"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search teammates by player name"
              />
            </div>
          </div>
          <SocialGameFilterSelect
            id="teammates-game-filter"
            label="Scope"
            value={gameFilter}
            onValueChange={setGameFilter}
            options={gameOptions}
            className="w-full sm:col-span-1 lg:col-span-1"
          />
          <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-1 lg:col-span-1">
            <Label htmlFor="teammates-sort" className="text-sm font-medium">
              Sort list
            </Label>
            <Select
              value={sortPresetValue}
              items={teammateSortPresetItems}
              onValueChange={handleSortPresetChange}
            >
              <SelectTrigger id="teammates-sort" className="w-full">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {TEAMMATE_SORT_PRESETS.map((p) => (
                  <SelectItem
                    key={`${p.key}:${p.dir}`}
                    value={`${p.key}:${p.dir}`}
                  >
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {sorted.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No co-op games in this title with anyone on the list.
          </p>
        ) : filteredBySearch.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No players match &ldquo;{searchQuery.trim()}&rdquo;. Try a different
            search.
          </p>
        ) : (
          <ScrollArea
            className="h-[min(56vh,36rem)] rounded-xl border md:h-[min(64vh,40rem)]"
            role="region"
            aria-label="Teammates list"
          >
            <ul className="divide-border/60 flex flex-col divide-y p-1 pr-3">
              {filteredBySearch.map((t) => {
                const s = getTeammateDisplayStats(t, gameFilter);
                const showByGame =
                  gameFilter === ALL_GAMES_VALUE && t.byGame.length > 0;

                return (
                  <li
                    key={identityRowKey(t.teammate)}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <PlayerImage
                          className="size-11 shrink-0"
                          image={t.teammate.image}
                          alt={t.teammate.name}
                        />
                        <div className="min-w-0">
                          <Link
                            href={insightPlayerProfileHref(t.teammate)}
                            className="text-foreground text-base font-semibold hover:underline"
                          >
                            {t.teammate.name}
                          </Link>
                          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                            {gameFilter === ALL_GAMES_VALUE &&
                              t.avgTeamPlacement !== null && (
                                <span className="tabular-nums">
                                  Avg placement ~{t.avgTeamPlacement.toFixed(1)}
                                </span>
                              )}
                            {t.lastPlayedAt && (
                              <span className="tabular-nums">
                                Last{" "}
                                <FormattedDate
                                  date={t.lastPlayedAt}
                                  pattern="MMM d, yyyy"
                                />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:max-w-2xl lg:flex-1 lg:grid-cols-5">
                        <StatBlock
                          label="Co-op win %"
                          value={
                            <span className="flex items-center gap-2">
                              {Math.round(s.winRateTogether * 100)}%
                              <Progress
                                value={Math.round(s.winRateTogether * 100)}
                                className="h-1.5 w-12 max-sm:hidden"
                                aria-hidden
                              />
                            </span>
                          }
                        />
                        <StatBlock label="Co-op" value={s.matchesTogether} />
                        <StatBlock label="Not won" value={s.nonWinsTogether} />
                        <StatBlock
                          label="Titles"
                          value={
                            gameFilter === ALL_GAMES_VALUE
                              ? t.uniqueGamesPlayed
                              : "—"
                          }
                        />
                        <StatBlock
                          label="Wins"
                          value={s.winsTogether}
                          title="Co-op wins together"
                        />
                      </div>
                    </div>
                    {showByGame && (
                      <Collapsible defaultOpen={false} className="group w-full">
                        <CollapsibleTrigger
                          className="border-border/60 bg-muted/40 hover:bg-muted/55 flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          type="button"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              By title
                              <span className="text-muted-foreground ml-1.5 font-normal tabular-nums">
                                ({t.byGame.length})
                              </span>
                            </p>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              Co-op stats for each game
                            </p>
                          </div>
                          <ChevronDown
                            className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
                            aria-hidden
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="pt-2">
                            <TeammatePerGameBreakdown
                              rows={t.byGame}
                              hideCaption
                              className="mt-0"
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
