"use client";

import { ChevronDown, Medal, Trophy } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@board-games/ui/collapsible";
import { Progress } from "@board-games/ui/progress";
import { ScrollArea } from "@board-games/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@board-games/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";
import { cn } from "@board-games/ui/utils";

import { PlayerImage } from "~/components/player-image";

type Insights = RouterOutputs["newGame"]["getGameInsights"];
type Cores = Insights["cores"];
type DetectedCore = Cores["pairs"][number];
type PairwiseStat = DetectedCore["pairwiseStats"][number];
type CorePlayer = DetectedCore["players"][number];

interface GroupMatchupsProps {
  cores: Cores;
}

// ─── Core Card Component (works for any core size) ───────────────

const CoreCard = ({ core }: { core: DetectedCore }) => {
  // Detect if this core is from manual winner games (no placement data)
  const isManualWinner = !core.groupOrdering.some(
    (entry) => entry.avgPlacement > 0,
  );

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      {/* Header: player avatars + names */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {core.players.map((p) => (
              <PlayerImage
                key={p.playerKey}
                image={
                  p.image
                    ? {
                        ...p.image,
                        type:
                          p.image.type === "file" || p.image.type === "svg"
                            ? p.image.type
                            : "file",
                        usageType: "player" as const,
                      }
                    : null
                }
                alt={p.playerName}
                className="ring-background h-8 w-8 ring-2"
              />
            ))}
          </div>
          <span className="text-sm font-medium">
            {core.players.map((p) => p.playerName).join(" + ")}
          </span>
        </div>
        <Badge variant="secondary">{core.matchCount} matches</Badge>
      </div>

      {/* Stability */}
      <div className="text-muted-foreground text-xs">
        {Math.round(core.stability * 100)}% exact lineup
      </div>

      {/* Group ordering podium (meaningful for k >= 3) */}
      {core.players.length >= 3 && core.groupOrdering.length > 0 && (
        <GroupOrderingSection groupOrdering={core.groupOrdering} />
      )}

      {/* Expandable section - only show if there are guests */}
      {core.guests.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger
            className="text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center justify-center gap-1 text-xs transition-colors"
            aria-label="Toggle additional details"
            tabIndex={0}
          >
            <span>More</span>
            <ChevronDown className="h-3 w-3 transition-transform [[data-state=open]>&]:rotate-180" />
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="space-y-3 border-t pt-2">
              {/* Pairwise stats (each row is collapsible for detail) */}
              {core.pairwiseStats.length > 0 && (
                <div className="space-y-2">
                  {core.pairwiseStats.map((ps) => (
                    <PairwiseRow
                      key={`${ps.playerA.playerKey}-${ps.playerB.playerKey}`}
                      pairwise={ps}
                      isManualWinner={isManualWinner}
                    />
                  ))}
                </div>
              )}
              <div>
                <div className="text-muted-foreground mb-1 text-xs font-medium">
                  Most Common Guests
                </div>
                <div className="flex flex-wrap gap-1">
                  {core.guests.slice(0, 5).map((g) => (
                    <Badge
                      key={g.player.playerKey}
                      variant="outline"
                      className="text-xs"
                    >
                      {g.player.playerName} ({g.count})
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

// ─── Group Ordering Section ──────────────────────────────────────

type GroupOrderingEntry = DetectedCore["groupOrdering"][number];

const GroupOrderingSection = ({
  groupOrdering,
}: {
  groupOrdering: GroupOrderingEntry[];
}) => {
  // Determine if we have placement data: any entry with avgPlacement > 0
  const hasPlacementData = groupOrdering.some(
    (entry) => entry.avgPlacement > 0,
  );
  const hasWinData = groupOrdering.some(
    (entry) => entry.wins > 0 || entry.losses > 0,
  );

  if (!hasPlacementData && !hasWinData) return null;

  const title = hasPlacementData ? "Placement Ranking" : "Win Rate Ranking";

  return (
    <div className="bg-muted/30 rounded-lg p-2">
      <div className="text-muted-foreground mb-1 text-xs font-medium">
        {title}
      </div>
      <div className="flex flex-col gap-1">
        {groupOrdering.map((entry) => (
          <div key={entry.player.playerKey} className="flex items-center gap-2">
            <RankBadge rank={entry.rank} />
            <span className="text-sm font-medium">
              {entry.player.playerName}
            </span>
            {hasPlacementData && entry.avgPlacement > 0 ? (
              <span className="text-muted-foreground text-xs">
                avg {entry.avgPlacement.toFixed(1)}
                {hasWinData && (entry.wins > 0 || entry.losses > 0) && (
                  <span className="ml-1">
                    · {Math.round(entry.winRate * 100)}% ({entry.wins}W-
                    {entry.losses}L)
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground text-xs">
                {Math.round(entry.winRate * 100)}% win ({entry.wins}W-
                {entry.losses}L)
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Pairwise Row (collapsible inline detail) ────────────────────

const PairwiseRow = ({
  pairwise,
  isManualWinner,
}: {
  pairwise: PairwiseStat;
  isManualWinner: boolean;
}) => {
  const rate = pairwise.finishesAboveRate;
  const ratePercent = Math.round(rate * 100);
  const rateLabel = isManualWinner ? "Win Rate" : "Finishes Above";

  return (
    <Collapsible>
      <CollapsibleTrigger
        className="hover:bg-muted/50 flex w-full cursor-pointer items-center gap-2 rounded-md p-2 transition-colors"
        aria-label={`${pairwise.playerA.playerName} vs ${pairwise.playerB.playerName}: ${ratePercent}% ${rateLabel}`}
        tabIndex={0}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="truncate font-medium">
              {pairwise.playerA.playerName}
            </span>
            <span className="text-muted-foreground">vs</span>
            <span className="truncate font-medium">
              {pairwise.playerB.playerName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceBadge confidence={pairwise.confidence} />
          <div className="w-20">
            <div className="flex justify-between text-xs">
              <span
                className={cn(
                  "font-semibold",
                  ratePercent >= 60
                    ? "text-green-600"
                    : ratePercent <= 40
                      ? "text-red-600"
                      : "text-yellow-600",
                )}
              >
                {ratePercent}%
              </span>
            </div>
            <Progress
              value={ratePercent}
              className={cn(
                "h-1.5",
                ratePercent >= 60
                  ? "[&>div]:bg-green-500"
                  : ratePercent <= 40
                    ? "[&>div]:bg-red-500"
                    : "[&>div]:bg-yellow-500",
              )}
            />
          </div>
          <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0 transition-transform [[data-state=open]>&]:rotate-180" />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <PairwiseDetail pair={pairwise} isManualWinner={isManualWinner} />
      </CollapsibleContent>
    </Collapsible>
  );
};

// ─── Pairwise Detail (inline collapsible content) ────────────────

const PairwiseDetail = ({
  pair,
  isManualWinner,
}: {
  pair: PairwiseStat;
  isManualWinner: boolean;
}) => {
  const ratePercent = Math.round(pair.finishesAboveRate * 100);
  const rateLabel = isManualWinner ? "Win Rate" : "Finishes Above";

  return (
    <div className="bg-muted/20 space-y-3 rounded-b-md border-t px-3 py-3">
      {/* Overall stats */}
      <div className="flex items-center gap-2">
        <PlayerAvatar player={pair.playerA} />
        <span className="text-muted-foreground text-xs">vs</span>
        <PlayerAvatar player={pair.playerB} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard
          value={`${ratePercent}%`}
          label={rateLabel}
          className={cn(
            ratePercent >= 60
              ? "text-green-600"
              : ratePercent <= 40
                ? "text-red-600"
                : "text-yellow-600",
          )}
        />
        <StatCard value={String(pair.matchCount)} label="Matches Together" />
        {!isManualWinner && (
          <StatCard
            value={`${pair.avgPlacementDelta > 0 ? "+" : ""}${pair.avgPlacementDelta.toFixed(1)}`}
            label="Avg Placement Δ"
          />
        )}
        {pair.avgScoreDelta !== null && (
          <StatCard
            value={`${pair.avgScoreDelta > 0 ? "+" : ""}${pair.avgScoreDelta.toFixed(1)}`}
            label="Avg Score Δ"
          />
        )}
      </div>

      {/* Player count breakdown */}
      {pair.byPlayerCount.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-medium">By Player Count</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14 text-xs">Count</TableHead>
                <TableHead className="text-right text-xs">Matches</TableHead>
                <TableHead className="text-right text-xs">
                  {rateLabel}
                </TableHead>
                {!isManualWinner && (
                  <TableHead className="text-right text-xs">
                    Avg Place Δ
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pair.byPlayerCount.map((bucket) => (
                <TableRow key={bucket.bucket}>
                  <TableCell className="text-xs font-medium">
                    {bucket.bucket}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {bucket.matchCount}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    <span
                      className={cn(
                        "font-semibold",
                        bucket.finishesAboveRate >= 0.6
                          ? "text-green-600"
                          : bucket.finishesAboveRate <= 0.4
                            ? "text-red-600"
                            : "text-yellow-600",
                      )}
                    >
                      {Math.round(bucket.finishesAboveRate * 100)}%
                    </span>
                  </TableCell>
                  {!isManualWinner && (
                    <TableCell className="text-right text-xs">
                      {bucket.avgPlacementDelta > 0 ? "+" : ""}
                      {bucket.avgPlacementDelta.toFixed(1)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

// ─── Stat Card (compact inline stat) ─────────────────────────────

const StatCard = ({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) => (
  <div className="rounded-md border p-2 text-center">
    <div className={cn("text-base font-bold", className)}>{value}</div>
    <div className="text-muted-foreground text-[10px]">{label}</div>
  </div>
);

// ─── Rank Badge (for podium positions) ───────────────────────────

const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) {
    return (
      <span
        className="flex h-5 w-5 items-center justify-center"
        title="1st place"
      >
        <Trophy className="h-4 w-4 text-yellow-500" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        className="flex h-5 w-5 items-center justify-center"
        title="2nd place"
      >
        <Medal className="h-4 w-4 text-slate-400" />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        className="flex h-5 w-5 items-center justify-center"
        title="3rd place"
      >
        <Medal className="h-4 w-4 text-amber-700" />
      </span>
    );
  }
  return (
    <span className="text-muted-foreground flex h-5 w-5 items-center justify-center text-xs font-bold">
      {rank}
    </span>
  );
};

// ─── Confidence Badge ────────────────────────────────────────────

const ConfidenceBadge = ({
  confidence,
}: {
  confidence: "low" | "medium" | "high";
}) => {
  const variant =
    confidence === "high"
      ? "default"
      : confidence === "medium"
        ? "secondary"
        : "outline";
  return (
    <Badge variant={variant} className="text-[10px]">
      {confidence === "low" ? "Low" : confidence === "medium" ? "Med" : "High"}
    </Badge>
  );
};

// ─── Player avatar helper ────────────────────────────────────────

const PlayerAvatar = ({ player }: { player: CorePlayer }) => (
  <div className="flex items-center gap-1.5">
    <PlayerImage
      image={
        player.image
          ? {
              ...player.image,
              type:
                player.image.type === "file" || player.image.type === "svg"
                  ? player.image.type
                  : "file",
              usageType: "player" as const,
            }
          : null
      }
      alt={player.playerName}
      className="h-6 w-6"
    />
    <span className="text-sm">{player.playerName}</span>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────

export const GroupMatchups = ({ cores }: GroupMatchupsProps) => {
  const hasPairs = cores.pairs.length > 0;
  const hasTrios = cores.trios.length > 0;
  const hasQuartets = cores.quartets.length > 0;

  // Determine which tabs to show
  const availableTabs: {
    value: string;
    label: string;
    data: DetectedCore[];
  }[] = [];
  if (hasPairs)
    availableTabs.push({ value: "pairs", label: "Pairs", data: cores.pairs });
  if (hasTrios)
    availableTabs.push({ value: "trios", label: "Trios", data: cores.trios });
  if (hasQuartets)
    availableTabs.push({
      value: "quartets",
      label: "Quartets",
      data: cores.quartets,
    });

  if (availableTabs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Matchups</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Not enough data to detect frequent player groups. Need at least 3
            co-appearances.
          </p>
        </CardContent>
      </Card>
    );
  }

  const defaultTab = availableTabs[0]?.value ?? "pairs";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Group Matchups</CardTitle>
      </CardHeader>
      <CardContent>
        {availableTabs.length === 1 ? (
          // Single tab: no tab UI needed
          <CoreList cores={availableTabs[0]?.data ?? []} />
        ) : (
          <Tabs defaultValue={defaultTab}>
            <TabsList
              className={cn(
                "grid w-full",
                availableTabs.length === 2 ? "grid-cols-2" : "grid-cols-3",
              )}
            >
              {availableTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label} ({tab.data.length})
                </TabsTrigger>
              ))}
            </TabsList>
            {availableTabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                <CoreList cores={tab.data} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

const CoreList = ({ cores }: { cores: DetectedCore[] }) => (
  <ScrollArea>
    <div className="flex max-h-[60vh] flex-col gap-3">
      {cores.map((core) => (
        <CoreCard key={core.coreKey} core={core} />
      ))}
    </div>
  </ScrollArea>
);
