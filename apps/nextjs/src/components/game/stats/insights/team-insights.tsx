"use client";

import { Trophy, Users } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { Progress } from "@board-games/ui/progress";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";
import { cn } from "@board-games/ui/utils";

import { PlayerImage } from "~/components/player-image";

type Insights = RouterOutputs["newGame"]["getGameInsights"];
type Teams = NonNullable<Insights["teams"]>;
type TeamCore = Teams["cores"]["pairs"][number];
type TeamConfig = Teams["configurations"][number];
type CorePlayer = TeamCore["players"][number];

interface TeamInsightsProps {
  teams: Teams;
}

// ─── Team Core Card ──────────────────────────────────────────────

const TeamCoreCard = ({ core }: { core: TeamCore }) => {
  const winRatePercent = Math.round(core.teamWinRate * 100);

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      {/* Header: player avatars + names + win rate */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {core.players.map((p) => (
              <PlayerAvatar
                key={p.playerKey}
                player={p}
                className="ring-background h-8 w-8 ring-2"
              />
            ))}
          </div>
          <span className="text-sm font-medium">
            {core.players.map((p) => p.playerName).join(" + ")}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary">{core.matchCount} matches</Badge>
        </div>
      </div>

      {/* Win rate bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5" />
            Team Win Rate
          </span>
          <span
            className={cn(
              "font-semibold",
              winRatePercent >= 60
                ? "text-green-600"
                : winRatePercent <= 40
                  ? "text-red-600"
                  : "text-yellow-600",
            )}
          >
            {winRatePercent}%
          </span>
        </div>
        <Progress
          value={winRatePercent}
          className={cn(
            "h-2",
            winRatePercent >= 60
              ? "[&>div]:bg-green-500"
              : winRatePercent <= 40
                ? "[&>div]:bg-red-500"
                : "[&>div]:bg-yellow-500",
          )}
        />
        <p className="text-muted-foreground text-xs">
          {core.teamWins} wins out of {core.teamMatches} team matches
        </p>
      </div>

      {/* Group ordering for trios+ */}
      {core.players.length >= 3 && core.groupOrdering.length > 0 && (
        <div className="bg-muted/30 rounded-lg p-2">
          <div className="text-muted-foreground mb-1 text-xs font-medium">
            Placement Ranking
          </div>
          <div className="flex items-center gap-2">
            {core.groupOrdering.map((entry, idx) => (
              <div key={entry.player.playerKey} className="flex items-center">
                {idx > 0 && (
                  <span className="text-muted-foreground mx-1">&gt;</span>
                )}
                <span className="text-sm font-medium">
                  {entry.player.playerName}
                </span>
                <span className="text-muted-foreground ml-1 text-xs">
                  ({entry.avgPlacement.toFixed(1)})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stability */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Stability:</span>
        <span>{Math.round(core.stability * 100)}% exact lineup</span>
      </div>
    </div>
  );
};

// ─── Team Config Card ────────────────────────────────────────────

const TeamConfigCard = ({ config }: { config: TeamConfig }) => {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      {/* Teams display */}
      <div className="flex flex-wrap items-center gap-2">
        {config.teams.map((team, idx) => (
          <div key={team.teamName} className="flex items-center gap-1">
            {idx > 0 && (
              <span className="text-muted-foreground mx-1 text-sm font-medium">
                vs
              </span>
            )}
            <div className="flex items-center gap-1 rounded-md border px-2 py-1">
              <div className="flex -space-x-1">
                {team.players.map((p) => (
                  <PlayerAvatar
                    key={p.playerKey}
                    player={p}
                    className="h-5 w-5"
                  />
                ))}
              </div>
              <span className="text-xs font-medium">
                {team.players.map((p) => p.playerName).join(", ")}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Match count + outcomes */}
      <div className="flex items-center gap-3">
        <Badge variant="secondary">{config.matchCount} matches</Badge>
        {config.outcomes.map((outcome) => {
          const team = config.teams[outcome.teamIndex];
          if (!team || outcome.wins === 0) return null;
          return (
            <span key={outcome.teamIndex} className="text-xs">
              <span className="font-medium">
                {team.players.map((p) => p.playerName).join("+")}
              </span>
              <span className="text-muted-foreground"> won {outcome.wins}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ─── Player avatar helper ────────────────────────────────────────

const PlayerAvatar = ({
  player,
  className,
}: {
  player: CorePlayer;
  className?: string;
}) => (
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
    className={className}
  />
);

// ─── Main Component ──────────────────────────────────────────────

export function TeamInsights({ teams }: TeamInsightsProps) {
  const hasCores =
    teams.cores.pairs.length > 0 ||
    teams.cores.trios.length > 0 ||
    teams.cores.quartets.length > 0;
  const hasConfigs = teams.configurations.length > 0;

  return (
    <div className="space-y-6">
      {/* Team Cores */}
      {hasCores && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Cores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TeamCoreTabs cores={teams.cores} />
          </CardContent>
        </Card>
      )}

      {/* Team Configurations */}
      {hasConfigs && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Common Matchup Configurations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea>
              <div className="flex max-h-[50vh] flex-col gap-2">
                {teams.configurations.map((config) => {
                  const configKey = config.teams
                    .map((t) => t.players.map((p) => p.playerKey).join(","))
                    .join("-vs-");
                  return <TeamConfigCard key={configKey} config={config} />;
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {!hasCores && !hasConfigs && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Not enough team data to show insights. Need at least 3
              co-appearances on the same team.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Team Core Tabs ──────────────────────────────────────────────

const TeamCoreTabs = ({ cores }: { cores: Teams["cores"] }) => {
  const availableTabs: {
    value: string;
    label: string;
    data: TeamCore[];
  }[] = [];

  if (cores.pairs.length > 0) {
    availableTabs.push({ value: "pairs", label: "Pairs", data: cores.pairs });
  }
  if (cores.trios.length > 0) {
    availableTabs.push({ value: "trios", label: "Trios", data: cores.trios });
  }
  if (cores.quartets.length > 0) {
    availableTabs.push({
      value: "quartets",
      label: "Quartets",
      data: cores.quartets,
    });
  }

  if (availableTabs.length === 0) return null;

  const defaultTab = availableTabs[0]?.value ?? "pairs";

  if (availableTabs.length === 1) {
    return <TeamCoreList cores={availableTabs[0]?.data ?? []} />;
  }

  return (
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
          <TeamCoreList cores={tab.data} />
        </TabsContent>
      ))}
    </Tabs>
  );
};

const TeamCoreList = ({ cores }: { cores: TeamCore[] }) => (
  <ScrollArea>
    <div className="flex max-h-[50vh] flex-col gap-3">
      {cores.map((core) => (
        <TeamCoreCard key={core.coreKey} core={core} />
      ))}
    </div>
  </ScrollArea>
);
