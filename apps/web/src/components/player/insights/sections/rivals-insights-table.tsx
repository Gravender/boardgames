"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { formatDuration } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
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
import { PlayerImage } from "~/components/player-image";

import { insightPlayerProfileHref } from "../player-insights-match-links";
import {
  ALL_GAMES_VALUE,
  formatPlacementAdvantage,
  getRivalDisplayStats,
  getRivalRivalryMeta,
  SocialGameFilterSelect,
  StatBlock,
  useRivalGameFilterOptions,
} from "./PeopleSocialInsightsHelpers";
import { RivalPerGameBreakdown } from "./social-by-game-breakdown";

type Rivals = RouterOutputs["newPlayer"]["stats"]["getPlayerTopRivals"];

type RivalSortKey =
  | "name"
  | "matches"
  | "winRateVs"
  | "uniqueGamesPlayed"
  | "lastPlayedAt"
  | "competitiveMatches"
  | "secondsPlayedTogether"
  | "avgPlacementAdvantage";

const rivalIdentityKey = (p: Rivals["rivals"][number]["opponent"]): string => {
  return p.type === "original" ? `o-${p.id}` : `s-${p.sharedId}`;
};

const RIVAL_SORT_PRESETS: {
  key: RivalSortKey;
  dir: "asc" | "desc";
  label: string;
}[] = [
  { key: "matches", dir: "desc", label: "Most H2H games" },
  { key: "winRateVs", dir: "desc", label: "Highest win %" },
  { key: "secondsPlayedTogether", dir: "desc", label: "Most time played" },
  { key: "avgPlacementAdvantage", dir: "desc", label: "Best placement edge" },
  { key: "competitiveMatches", dir: "desc", label: "Most competitive games" },
  { key: "uniqueGamesPlayed", dir: "desc", label: "Most distinct titles" },
  { key: "lastPlayedAt", dir: "desc", label: "Recently played" },
  { key: "name", dir: "asc", label: "Name (A–Z)" },
];

const RIVAL_SORT_KEYS = [
  "name",
  "matches",
  "winRateVs",
  "uniqueGamesPlayed",
  "lastPlayedAt",
  "competitiveMatches",
  "secondsPlayedTogether",
  "avgPlacementAdvantage",
] as const satisfies readonly RivalSortKey[];

const RIVAL_SORT_KEY_SET = new Set<string>(RIVAL_SORT_KEYS);

export function RivalsTable({ data }: { data: Rivals }) {
  const [gameFilter, setGameFilter] = useState(ALL_GAMES_VALUE);
  const gameOptions = useRivalGameFilterOptions(data.rivals);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<RivalSortKey>("matches");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sortPresetValue = `${sortKey}:${sortDir}`;

  const handleSortPresetChange = (v: string | null) => {
    if (v === null) {
      return;
    }
    const parts = v.split(":");
    if (parts.length !== 2) {
      return;
    }
    const keyStr = parts[0];
    const dirStr = parts[1];
    if (keyStr === undefined || dirStr === undefined) {
      return;
    }
    if (dirStr !== "asc" && dirStr !== "desc") {
      return;
    }
    if (!RIVAL_SORT_KEY_SET.has(keyStr)) {
      return;
    }
    setSortKey(keyStr as RivalSortKey);
    setSortDir(dirStr);
  };

  const sorted = useMemo(() => {
    const base =
      gameFilter === ALL_GAMES_VALUE
        ? [...data.rivals]
        : data.rivals.filter((r) =>
            r.byGame.some((g) => g.gameIdKey === gameFilter),
          );
    const dir = sortDir === "asc" ? 1 : -1;
    base.sort((a, b) => {
      const sa = getRivalDisplayStats(a, gameFilter);
      const sb = getRivalDisplayStats(b, gameFilter);
      const ma = getRivalRivalryMeta(a, gameFilter);
      const mb = getRivalRivalryMeta(b, gameFilter);
      switch (sortKey) {
        case "name":
          return a.opponent.name.localeCompare(b.opponent.name) * dir;
        case "matches":
          return (sa.matches - sb.matches) * dir;
        case "winRateVs":
          return (sa.winRateVs - sb.winRateVs) * dir;
        case "uniqueGamesPlayed":
          if (gameFilter === ALL_GAMES_VALUE) {
            return (a.uniqueGamesPlayed - b.uniqueGamesPlayed) * dir;
          }
          return (sa.matches - sb.matches) * dir;
        case "competitiveMatches":
          return (ma.competitiveMatches - mb.competitiveMatches) * dir;
        case "secondsPlayedTogether":
          return (ma.secondsPlayedTogether - mb.secondsPlayedTogether) * dir;
        case "avgPlacementAdvantage": {
          const aVal = ma.avgPlacementAdvantage;
          const bVal = mb.avgPlacementAdvantage;
          if (aVal === null && bVal === null) {
            return 0;
          }
          if (aVal === null) {
            return 1;
          }
          if (bVal === null) {
            return -1;
          }
          return (aVal - bVal) * dir;
        }
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
  }, [data.rivals, sortKey, sortDir, gameFilter]);

  const filteredBySearch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return sorted;
    }
    return sorted.filter((r) => r.opponent.name.toLowerCase().includes(q));
  }, [sorted, searchQuery]);

  if (data.rivals.length === 0) {
    return (
      <Card className="border-border/80 bg-card/70 border shadow-sm backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-lg">Rivals</CardTitle>
          <CardDescription>
            Head-to-head opponents in competitive matches.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No rivals yet. You need at least five head-to-head games against
            someone to appear here.
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
          Rivals
        </CardTitle>
        <CardDescription>
          Summary per person, then a per-title table for every game you’ve
          played against them. Filter one game to compare everyone in that title
          only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-2 sm:px-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-2">
            <Label htmlFor="rivals-search" className="text-sm font-medium">
              Search
            </Label>
            <div className="relative">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="rivals-search"
                type="search"
                autoComplete="off"
                placeholder="Search by player name…"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search rivals by player name"
              />
            </div>
          </div>
          <SocialGameFilterSelect
            id="rivals-game-filter"
            label="Scope"
            value={gameFilter}
            onValueChange={setGameFilter}
            options={gameOptions}
            className="w-full sm:col-span-1 lg:col-span-1"
          />
          <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-1 lg:col-span-1">
            <Label htmlFor="rivals-sort" className="text-sm font-medium">
              Sort list
            </Label>
            <Select
              value={sortPresetValue}
              onValueChange={handleSortPresetChange}
            >
              <SelectTrigger id="rivals-sort" className="w-full">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {RIVAL_SORT_PRESETS.map((p) => (
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
            No head-to-head games in this title with anyone on the list.
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
            aria-label="Rivals list"
          >
            <ul className="divide-border/60 flex flex-col divide-y p-1 pr-3">
              {filteredBySearch.map((r) => {
                const s = getRivalDisplayStats(r, gameFilter);
                const meta = getRivalRivalryMeta(r, gameFilter);
                const showByGame =
                  gameFilter === ALL_GAMES_VALUE && r.byGame.length > 0;

                return (
                  <li
                    key={rivalIdentityKey(r.opponent)}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <PlayerImage
                          className="size-11 shrink-0"
                          image={r.opponent.image}
                          alt={r.opponent.name}
                        />
                        <div className="min-w-0">
                          <Link
                            href={insightPlayerProfileHref(r.opponent)}
                            className="text-foreground text-base font-semibold hover:underline"
                          >
                            {r.opponent.name}
                          </Link>
                          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant="secondary" className="tabular-nums">
                              W{s.winsVs} · L{s.lossesVs}
                              {s.tiesVs > 0 ? ` · T${s.tiesVs}` : ""}
                            </Badge>
                            <span
                              className={cn(
                                "tabular-nums",
                                s.winLossDifferential > 0 &&
                                  "text-emerald-600 dark:text-emerald-400",
                                s.winLossDifferential < 0 &&
                                  "text-rose-600 dark:text-rose-400",
                              )}
                            >
                              Δ{s.winLossDifferential > 0 ? "+" : ""}
                              {s.winLossDifferential}
                            </span>
                            {r.lastPlayedAt && (
                              <span className="tabular-nums">
                                Last{" "}
                                <FormattedDate
                                  date={r.lastPlayedAt}
                                  pattern="MMM d, yyyy"
                                />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:max-w-4xl lg:flex-1 lg:grid-cols-6">
                        <StatBlock
                          label="Win %"
                          value={
                            <span className="flex items-center gap-2">
                              {Math.round(s.winRateVs * 100)}%
                              <Progress
                                value={Math.round(s.winRateVs * 100)}
                                className="h-1.5 w-12 max-sm:hidden"
                                aria-hidden
                              />
                            </span>
                          }
                        />
                        <StatBlock label="H2H" value={s.matches} />
                        <StatBlock
                          label="Comp"
                          value={meta.competitiveMatches}
                        />
                        <StatBlock
                          label="Titles"
                          value={
                            gameFilter === ALL_GAMES_VALUE
                              ? r.uniqueGamesPlayed
                              : "—"
                          }
                        />
                        <StatBlock
                          label="Plc Δ"
                          value={formatPlacementAdvantage(
                            meta.avgPlacementAdvantage,
                          )}
                          title="Competitive matches with placements: mean (rival placement − yours). Positive = you placed better on average."
                        />
                        <StatBlock
                          label="Time"
                          value={formatDuration(meta.secondsPlayedTogether)}
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
                                ({r.byGame.length})
                              </span>
                            </p>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              Head-to-head stats for each game
                            </p>
                          </div>
                          <ChevronDown
                            className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
                            aria-hidden
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="pt-2">
                            <RivalPerGameBreakdown
                              rows={r.byGame}
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
