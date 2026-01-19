"use client";

import {
  BarChart3,
  Check,
  ChevronsUpDown,
  Shuffle,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@board-games/ui/chart";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@board-games/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import { ScrollArea, ScrollBar } from "@board-games/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@board-games/ui/table";
import { cn } from "@board-games/ui/utils";

import { PlayerImage } from "~/components/player-image";
import { useRoleStats } from "~/hooks/game-stats/use-role-stats";

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type PlayerStats = GameStats["players"][number];

export function RolePlayerTab({ players }: { players: PlayerStats[] }) {
  const {
    selectedPlayer,
    setSelectedPlayer,
    playerComboboxOpen,
    setPlayerComboboxOpen,
    selectedPlayerAvgPlacement,
    formatPlacementDistribution,
  } = useRoleStats({
    roleStats: [],
    userStats: undefined,
    players,
  });

  return (
    <>
      {/* Player Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Player</CardTitle>
        </CardHeader>
        <CardContent>
          <Popover
            open={playerComboboxOpen}
            onOpenChange={setPlayerComboboxOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={playerComboboxOpen}
                className="w-full justify-between bg-transparent"
              >
                {selectedPlayer ? (
                  <div className="flex items-center gap-2">
                    <PlayerImage
                      className="h-5 w-5"
                      image={selectedPlayer.image}
                      alt={selectedPlayer.name}
                    />
                    <span>{selectedPlayer.name}</span>
                    {selectedPlayer.isUser && (
                      <Badge variant="secondary" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                ) : (
                  "Choose a player to analyze..."
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="max-h-[300px] w-[--radix-popover-trigger-width]"
              align="start"
            >
              <Command>
                <CommandInput
                  className="hover:border-none focus:outline-none"
                  placeholder="Search players..."
                />
                <CommandList>
                  <CommandEmpty>No player found.</CommandEmpty>
                  <CommandGroup>
                    {players.map((player) => {
                      const hasRoles = player.roles.length > 0;
                      return (
                        <CommandItem
                          key={player.id}
                          value={`${player.name} ${player.isUser ? "you" : ""}`}
                          disabled={!hasRoles}
                          onSelect={() => {
                            if (hasRoles) {
                              setSelectedPlayer(player);
                              setPlayerComboboxOpen(false);
                            }
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedPlayer?.id === player.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <div className="flex items-center gap-2">
                            <PlayerImage
                              className="h-5 w-5"
                              image={player.image}
                              alt={player.name}
                            />
                            <span>{player.name}</span>
                            {player.isUser && (
                              <Badge variant="secondary" className="text-xs">
                                You
                              </Badge>
                            )}
                            {!hasRoles && (
                              <span className="text-muted-foreground text-xs">
                                (No roles)
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Player Role Performance */}
      {selectedPlayer?.roles && selectedPlayer.roles.length > 0 && (
        <div className="space-y-6">
          {/* Role Performance Radar Chart */}
          {selectedPlayer.roles.length >= 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  {selectedPlayer.name}'s Role Performance Radar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={
                    selectedPlayerAvgPlacement === null
                      ? {
                          winRate: {
                            label: "Win Rate",
                            color: "var(--chart-1)",
                          },
                        }
                      : {
                          winRate: {
                            label: "Win Rate",
                            color: "var(--chart-1)",
                          },
                          placement: {
                            label: "Placement",
                            color: "var(--chart-3)",
                          },
                        }
                  }
                  className="h-[400px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      data={selectedPlayer.roles.map((role) => {
                        const avgPlacement = formatPlacementDistribution(
                          role.placements,
                        );
                        if (avgPlacement === null) {
                          return {
                            role: role.name,
                            winRate: role.winRate * 100,
                          };
                        }

                        // Calculate max players from placements keys
                        const placementKeys = Object.keys(role.placements);
                        const maxPlayers =
                          placementKeys.length > 0
                            ? Math.max(...placementKeys.map(Number))
                            : 1;
                        const placementNum = Number.parseFloat(avgPlacement);
                        // Guard against NaN
                        if (Number.isNaN(placementNum) || maxPlayers < 1) {
                          return {
                            role: role.name,
                            winRate: role.winRate * 100,
                            placement: 100,
                          };
                        }
                        // Normalize placement 1..maxPlayers to 100..0
                        const normalized =
                          maxPlayers > 1
                            ? ((maxPlayers - placementNum) / (maxPlayers - 1)) *
                              100
                            : 100;
                        const formattedPlacement = Math.max(
                          0,
                          Math.min(100, normalized),
                        );

                        return {
                          role: role.name,
                          winRate: role.winRate * 100,
                          placement: formattedPlacement,
                        };
                      })}
                    >
                      <PolarGrid />
                      <PolarAngleAxis dataKey="role" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      <Radar
                        name="Win Rate"
                        dataKey="winRate"
                        stroke="var(--color-winRate)"
                        fill="var(--color-winRate)"
                        fillOpacity={0.6}
                      />
                      {selectedPlayerAvgPlacement !== null && (
                        <Radar
                          name="Placement"
                          dataKey="placement"
                          stroke="var(--color-placement)"
                          fill="var(--color-placement)"
                          fillOpacity={0.6}
                        />
                      )}
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Detailed Role Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {selectedPlayer.name}'s Detailed Role Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table containerClassname="max-h-[40vh]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center">Games</TableHead>
                    <TableHead className="text-center">Wins</TableHead>
                    <TableHead className="text-center">Win Rate</TableHead>
                    {selectedPlayerAvgPlacement !== null && (
                      <TableHead className="text-center">
                        Avg Placement
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...selectedPlayer.roles]
                    .sort((a, b) => {
                      if (a.matchCount > 10 && b.matchCount > 10) {
                        return b.winRate - a.winRate;
                      }
                      if (a.matchCount > 10 && b.matchCount <= 10) {
                        return -1;
                      }
                      if (a.matchCount <= 10 && b.matchCount > 10) {
                        return 1;
                      }
                      return b.matchCount - a.matchCount;
                    })
                    .map((role) => (
                      <TableRow key={role.roleId}>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <span className="font-medium">{role.name}</span>
                            {role.description && (
                              <ScrollArea>
                                <div className="text-muted-foreground max-w-[20vw] text-xs">
                                  {role.description}
                                </div>
                                <ScrollBar orientation="horizontal" />
                              </ScrollArea>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {role.matchCount}
                        </TableCell>
                        <TableCell className="text-center font-medium text-green-600">
                          {role.wins}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-lg font-bold">
                              {Math.round(role.winRate * 100)}%
                            </span>
                            {role.winRate >= 0.6 ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : role.winRate <= 0.3 ? (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : null}
                          </div>
                        </TableCell>
                        {selectedPlayerAvgPlacement !== null && (
                          <TableCell className="text-center font-semibold">
                            {formatPlacementDistribution(role.placements)}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Player Role Combos */}
          {selectedPlayer.roleCombos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shuffle className="h-5 w-5" />
                  {selectedPlayer.name}'s Role Combinations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea>
                  <div className="flex max-h-[40vh] flex-col gap-2">
                    {[...selectedPlayer.roleCombos]
                      .sort((a, b) => {
                        if (a.matchCount > 10 && b.matchCount > 10) {
                          return b.winRate - a.winRate;
                        }
                        if (a.matchCount > 10 && b.matchCount <= 10) {
                          return -1;
                        }
                        if (a.matchCount <= 10 && b.matchCount > 10) {
                          return 1;
                        }
                        return b.matchCount - a.matchCount;
                      })
                      .map((combo) => (
                        <div
                          key={combo.roles.map((role) => role.id).join("+")}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {combo.roles.map((role, roleIndex) => (
                                <div
                                  key={role.id}
                                  className="flex items-center gap-1"
                                >
                                  <Badge variant="outline" className="text-xs">
                                    {role.name}
                                  </Badge>
                                  {roleIndex < combo.roles.length - 1 && (
                                    <span className="text-muted-foreground text-xs">
                                      +
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="text-muted-foreground text-sm">
                              {combo.matchCount} games
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {Math.round(combo.winRate * 100)}%
                            </div>
                            {selectedPlayerAvgPlacement !== null && (
                              <div className="text-muted-foreground text-xs">
                                Avg place:{" "}
                                {formatPlacementDistribution(combo.placements)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {selectedPlayer?.roles.length === 0 && (
        <Card>
          <CardContent className="text-muted-foreground p-6 text-center">
            No role performance data available for {selectedPlayer.name}.
          </CardContent>
        </Card>
      )}
    </>
  );
}
