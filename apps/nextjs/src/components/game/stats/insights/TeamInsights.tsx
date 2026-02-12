"use client";

import { useMemo, useState } from "react";
import { Swords, Trophy, Users } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { Progress } from "@board-games/ui/progress";
import { ScrollArea } from "@board-games/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@board-games/ui/toggle-group";
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

type ViewMode = "same-team" | "opposing";

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

// ─── Helpers ─────────────────────────────────────────────────────

const deriveShapeLabel = (config: TeamConfig): string => {
  const sizes = config.teams.map((t) => t.players.length).sort((a, b) => b - a);
  return sizes.join("v");
};

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

      {/* Stability */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Stability:</span>
        <span>{Math.round(core.stability * 100)}% exact lineup</span>
      </div>
    </div>
  );
};

// ─── Team Config Card (enhanced) ─────────────────────────────────

const TeamConfigCard = ({ config }: { config: TeamConfig }) => {
  const shapeLabel = deriveShapeLabel(config);
  const totalWins = config.outcomes.reduce((acc, o) => acc + o.wins, 0);

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      {/* Shape badge + match count */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {shapeLabel}
        </Badge>
        <Badge variant="secondary">{config.matchCount} matches</Badge>
      </div>

      {/* Teams display with parenthesized names and "vs" */}
      <div className="flex flex-wrap items-center gap-1">
        {config.teams.map((team, idx) => (
          <div
            key={`${team.teamName}-${idx}`}
            className="flex items-center gap-1"
          >
            {idx > 0 && (
              <span className="text-muted-foreground mx-1 text-sm font-semibold">
                vs
              </span>
            )}
            <div className="flex items-center gap-1.5 rounded-md border px-2 py-1">
              <div className="flex -space-x-1">
                {team.players.map((p) => (
                  <PlayerAvatar
                    key={p.playerKey}
                    player={p}
                    className="h-5 w-5"
                  />
                ))}
              </div>
              <span className="text-xs">
                ({team.players.map((p) => p.playerName).join(" + ")})
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Outcomes -- prominent win/loss display */}
      {totalWins > 0 && (
        <div className="bg-muted/30 flex flex-wrap items-center gap-3 rounded-md px-3 py-2">
          {config.outcomes.map((outcome) => {
            const team = config.teams[outcome.teamIndex];
            if (!team) return null;
            const winPercent =
              config.matchCount > 0
                ? Math.round((outcome.wins / config.matchCount) * 100)
                : 0;
            const isWinning = outcome.wins > config.matchCount / 2;
            return (
              <div
                key={outcome.teamIndex}
                className="flex items-center gap-1.5 text-sm"
              >
                <div className="flex -space-x-1">
                  {team.players.slice(0, 3).map((p) => (
                    <PlayerAvatar
                      key={p.playerKey}
                      player={p}
                      className="h-4 w-4"
                    />
                  ))}
                </div>
                <span
                  className={cn(
                    "font-semibold",
                    isWinning ? "text-green-600" : "text-muted-foreground",
                  )}
                >
                  {outcome.wins}W
                </span>
                <span className="text-muted-foreground text-xs">
                  ({winPercent}%)
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Opposing Teams View (with shape filter) ─────────────────────

const OpposingTeamsView = ({
  configurations,
}: {
  configurations: TeamConfig[];
}) => {
  const [shapeFilter, setShapeFilter] = useState<string>("all");

  const availableShapes = useMemo(() => {
    const shapes = new Set<string>();
    for (const config of configurations) {
      shapes.add(deriveShapeLabel(config));
    }
    return Array.from(shapes).sort();
  }, [configurations]);

  const filteredConfigs = useMemo(() => {
    if (shapeFilter === "all") return configurations;
    return configurations.filter(
      (config) => deriveShapeLabel(config) === shapeFilter,
    );
  }, [configurations, shapeFilter]);

  const handleShapeFilterChange = (value: string) => {
    setShapeFilter(value);
  };

  return (
    <div className="space-y-3">
      {/* Shape filter */}
      {availableShapes.length > 1 && (
        <div className="flex items-center gap-2">
          <Select value={shapeFilter} onValueChange={handleShapeFilterChange}>
            <SelectTrigger
              className="w-[130px]"
              aria-label="Filter by team shape"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shapes</SelectItem>
              {availableShapes.map((shape) => (
                <SelectItem key={shape} value={shape}>
                  {shape}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Config list */}
      {filteredConfigs.length > 0 ? (
        <ScrollArea>
          <div className="flex max-h-[50vh] flex-col gap-2">
            {filteredConfigs.map((config) => {
              const configKey = config.teams
                .map((t) => t.players.map((p) => p.playerKey).join(","))
                .join("-vs-");
              return <TeamConfigCard key={configKey} config={config} />;
            })}
          </div>
        </ScrollArea>
      ) : (
        <p className="text-muted-foreground text-sm">
          No configurations match the selected shape.
        </p>
      )}
    </div>
  );
};

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

// ─── Main Component ──────────────────────────────────────────────

export function TeamInsights({ teams }: TeamInsightsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("same-team");

  const hasCores =
    teams.cores.pairs.length > 0 ||
    teams.cores.trios.length > 0 ||
    teams.cores.quartets.length > 0;
  const hasConfigs = teams.configurations.length > 0;

  const handleViewModeChange = (value: string) => {
    if (value === "same-team" || value === "opposing") {
      setViewMode(value);
    }
  };

  if (!hasCores && !hasConfigs) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">
            Not enough team data to show insights. Need at least 3
            co-appearances on the same team.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* View toggle */}
      {hasCores && hasConfigs && (
        <div className="flex items-center gap-3">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={handleViewModeChange}
            variant="outline"
            aria-label="Toggle between Same Team and Opposing Teams view"
          >
            <ToggleGroupItem
              value="same-team"
              aria-label="Same Team"
              className="gap-1.5 px-3"
            >
              <Users className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Same Team</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="opposing"
              aria-label="Opposing Teams"
              className="gap-1.5 px-3"
            >
              <Swords className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Opposing Teams</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {/* Same Team view */}
      {viewMode === "same-team" && hasCores && (
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

      {/* Opposing Teams view */}
      {viewMode === "opposing" && hasConfigs && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5" />
              Opposing Matchup Configurations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OpposingTeamsView configurations={teams.configurations} />
          </CardContent>
        </Card>
      )}

      {/* Fallback: if only one section exists, show it regardless of toggle */}
      {viewMode === "same-team" && !hasCores && hasConfigs && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5" />
              Opposing Matchup Configurations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OpposingTeamsView configurations={teams.configurations} />
          </CardContent>
        </Card>
      )}

      {viewMode === "opposing" && !hasConfigs && hasCores && (
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
    </div>
  );
}
