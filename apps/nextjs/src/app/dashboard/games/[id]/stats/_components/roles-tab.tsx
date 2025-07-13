"use client";

import { useMemo, useState } from "react";
import {
  Award,
  BarChart3,
  Check,
  ChevronsUpDown,
  Shuffle,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
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
import { Progress } from "@board-games/ui/progress";
import { ScrollArea, ScrollBar } from "@board-games/ui/scroll-area";
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

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type RoleCombos = GameStats["roleCombos"];
type RoleStats = GameStats["roleStats"][number];
type Players = GameStats["players"];
type PlayerStats = Players[number];
export default function RolesTab({
  userStats,
  roleCombos,
  roleStats,
  players,
}: {
  roleCombos: RoleCombos;
  roleStats: RoleStats[];
  userStats: PlayerStats | undefined;
  players: Players;
}) {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(
    players[0] ?? null,
  );
  const [selectedRole, setSelectedRole] = useState<RoleStats | null>(
    roleStats[0] ?? null,
  );
  const [playerComboboxOpen, setPlayerComboboxOpen] = useState(false);
  const [roleComboboxOpen, setRoleComboboxOpen] = useState(false);

  const topFiveRoles = useMemo(() => {
    const sortedRoles = roleStats.toSorted((a, b) => {
      if (a.winRate === b.winRate) {
        return a.name.localeCompare(b.name);
      }
      if (a.matchCount > 10 && b.matchCount > 10) {
        return b.winRate - a.winRate;
      }
      return b.matchCount - a.matchCount;
    });
    return sortedRoles.slice(0, 5);
  }, [roleStats]);
  const roleRecommendations = useMemo(() => {
    if (!userStats) return [];

    return userStats.roles
      .filter((role) => role.matchCount >= 5)
      .sort((a, b) => {
        // Sort by win rate, then by match count
        if (Math.abs(a.winRate - b.winRate) > 0.1) return b.winRate - a.winRate;
        return b.matchCount - a.matchCount;
      })
      .map((role, index) => ({
        ...role,
        rank: index + 1,
        recommendation:
          index === 0
            ? "Best"
            : index === 1
              ? "Good"
              : index === 2
                ? "Average"
                : "Consider Improving",
      }));
  }, [userStats]);
  const bestRoleCombos = useMemo(() => {
    if (!userStats) return [];

    return userStats.roleCombos
      .filter((combo) => combo.matchCount >= 5)
      .sort((a, b) => {
        if (Math.abs(a.winRate - b.winRate) > 0.1) return b.winRate - a.winRate;
        return b.matchCount - a.matchCount;
      })
      .slice(0, 6);
  }, [userStats]);
  const selectedRoleAvgPlacement = useMemo(() => {
    if (!selectedRole) return null;
    return formatPlacementDistribution(selectedRole.placements);
  }, [selectedRole]);
  const selectedPlayerAvgPlacement = useMemo(() => {
    if (!selectedPlayer) return null;
    return formatPlacementDistribution(selectedPlayer.placements);
  }, [selectedPlayer]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Role-Based Performance Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="player" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              By Player
            </TabsTrigger>
            <TabsTrigger value="role" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              By Role
            </TabsTrigger>
            <TabsTrigger value="combos" className="flex items-center gap-2">
              <Shuffle className="h-4 w-4" />
              Role Combos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Role Performance Overview */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Role Performance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={Object.fromEntries(
                      roleStats.map((role, index) => [
                        role.name,
                        {
                          label: role.name,
                          color: `hsl(var(--chart-${(index % 5) + 1}))`,
                        },
                      ]),
                    )}
                    className="h-[300px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={roleStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          fontSize={12}
                        />
                        <YAxis
                          tickFormatter={(value) =>
                            `${(Number(value) * 100).toFixed(1)}%`
                          }
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) =>
                                `${(Number(value) * 100).toFixed(1)}%`
                              }
                            />
                          }
                        />
                        <Bar
                          dataKey="winRate"
                          fill="hsl(var(--chart-1))"
                          name="Win Rate"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Role Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={Object.fromEntries(
                      roleStats.map((role, index) => [
                        role.name,
                        {
                          label: role.name,
                          color: `hsl(var(--chart-${index + 1}))`,
                        },
                      ]),
                    )}
                    className="h-[300px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topFiveRoles}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, matchCount }) =>
                            `${name} (${matchCount})`
                          }
                          outerRadius={80}
                          fill="#hsl(var(--chart-1))"
                          dataKey="matchCount"
                        >
                          {roleStats.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={`hsl(var(--chart-${index + 1}))`}
                            />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Role Recommendations */}
            {roleRecommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Your Role Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {roleRecommendations.slice(0, 6).map((role) => (
                      <div key={role.roleId} className="rounded-lg border p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              {role.name}
                            </span>
                          </div>
                          <Badge
                            variant={
                              role.rank === 1
                                ? "default"
                                : role.rank <= 3
                                  ? "secondary"
                                  : "outline"
                            }
                            className="text-xs"
                          >
                            #{role.rank}
                          </Badge>
                        </div>

                        {role.description && (
                          <p className="mb-2 text-xs text-muted-foreground">
                            {role.description}
                          </p>
                        )}

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Win Rate:
                            </span>
                            <span
                              className={`font-semibold ${
                                role.winRate >= 0.7
                                  ? "text-green-600"
                                  : role.winRate >= 0.5
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }`}
                            >
                              {Math.round(role.winRate * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Avg Place:
                            </span>
                            <span className="font-semibold">
                              {formatPlacementDistribution(role.placements)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Games:
                            </span>
                            <span className="font-semibold">
                              {role.matchCount}
                            </span>
                          </div>
                        </div>

                        <Progress value={role.winRate * 100} className="mt-3" />

                        <div className="mt-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              role.recommendation === "Best"
                                ? "border-green-500 text-green-700"
                                : role.recommendation === "Good"
                                  ? "border-blue-500 text-blue-700"
                                  : role.recommendation === "Average"
                                    ? "border-yellow-500 text-yellow-700"
                                    : "border-red-500 text-red-700"
                            }`}
                          >
                            {role.recommendation}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Best Role Combos */}
            {bestRoleCombos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shuffle className="h-5 w-5" />
                    Your Best Role Combinations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {bestRoleCombos.map((combo, index) => (
                      <div
                        key={index}
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
                                  <span className="text-xs text-muted-foreground">
                                    +
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {combo.matchCount} games
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {Math.round(combo.winRate * 100)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Avg place:{" "}
                            {formatPlacementDistribution(combo.placements)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="player" className="space-y-6">
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
                          {players
                            .filter((player) => player.roles.length > 0)
                            .map((player) => (
                              <CommandItem
                                key={player.id}
                                value={`${player.name} ${player.isUser ? "you" : ""}`}
                                onSelect={() => {
                                  setSelectedPlayer(player);
                                  setPlayerComboboxOpen(false);
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
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      You
                                    </Badge>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
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
                          selectedRoleAvgPlacement === null
                            ? {
                                winRate: {
                                  label: "Win Rate",
                                  color: "hsl(var(--chart-1))",
                                },
                              }
                            : {
                                winRate: {
                                  label: "Win Rate",
                                  color: "hsl(var(--chart-1))",
                                },
                                placement: {
                                  label: "Placement",
                                  color: "hsl(var(--chart-3))",
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
                              const formattedPlacement =
                                avgPlacement === null
                                  ? 0
                                  : (5 - Number.parseFloat(avgPlacement)) * 25;
                              if (selectedRoleAvgPlacement === null) {
                                return {
                                  role: role.name,
                                  winRate: role.winRate * 100,
                                };
                              }

                              return {
                                role: role.name,
                                winRate: role.winRate * 100,
                                placement: formattedPlacement, // Invert and scale placement (lower is better)
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
                          <TableHead className="text-center">
                            Win Rate
                          </TableHead>
                          {selectedPlayerAvgPlacement !== null && (
                            <TableHead className="text-center">
                              Avg Placement
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPlayer.roles
                          .sort((a, b) => {
                            if (a.matchCount > 10 && b.matchCount > 10) {
                              return b.winRate - a.winRate;
                            }
                            return b.matchCount - a.matchCount;
                          })
                          .map((role) => (
                            <TableRow key={role.roleId}>
                              <TableCell>
                                <div className="flex flex-col gap-2">
                                  <span className="font-medium">
                                    {role.name}
                                  </span>
                                  {role.description && (
                                    <ScrollArea>
                                      <div className="max-w-[20vw] text-xs text-muted-foreground">
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
                          {selectedPlayer.roleCombos
                            .sort((a, b) => {
                              if (a.matchCount > 10 && b.matchCount > 10) {
                                return b.winRate - a.winRate;
                              }
                              return b.matchCount - a.matchCount;
                            })
                            .map((combo, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between rounded-lg border p-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {combo.roles.map((role, roleIndex) => (
                                      <div
                                        key={role.id}
                                        className="flex items-center gap-1"
                                      >
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {role.name}
                                        </Badge>
                                        {roleIndex < combo.roles.length - 1 && (
                                          <span className="text-xs text-muted-foreground">
                                            +
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {combo.matchCount} games
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold">
                                    {Math.round(combo.winRate * 100)}%
                                  </div>
                                  {selectedPlayerAvgPlacement !== null && (
                                    <div className="text-xs text-muted-foreground">
                                      Avg place:{" "}
                                      {formatPlacementDistribution(
                                        combo.placements,
                                      )}
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

            {selectedPlayer && selectedPlayer.roles.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No role performance data available for {selectedPlayer.name}.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="role" className="space-y-6">
            {/* Role Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select Role</CardTitle>
              </CardHeader>
              <CardContent>
                <Popover
                  open={roleComboboxOpen}
                  onOpenChange={setRoleComboboxOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={roleComboboxOpen}
                      className="w-full justify-between bg-transparent"
                    >
                      {selectedRole ? (
                        <div className="flex items-center gap-2">
                          <span>{selectedRole.name}</span>
                          {selectedRole.description && (
                            <span className="text-sm text-muted-foreground">
                              - {selectedRole.description}
                            </span>
                          )}
                        </div>
                      ) : (
                        "Choose a role to analyze..."
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
                        placeholder="Search roles..."
                      />
                      <CommandList>
                        <CommandEmpty>No role found.</CommandEmpty>
                        <CommandGroup>
                          {roleStats
                            .filter((role) => role.matchCount > 0)
                            .map((role) => (
                              <CommandItem
                                key={role.roleId}
                                value={`${role.name} ${role.description ?? ""}`}
                                onSelect={() => {
                                  setSelectedRole(role);
                                  setRoleComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedRole?.roleId === role.roleId
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                <div className="flex items-center gap-2">
                                  <span>{role.name}</span>
                                  {role.description && (
                                    <span className="text-sm text-muted-foreground">
                                      - {role.description}
                                    </span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>

            {/* Role Analysis */}
            {selectedRole && (
              <div className="space-y-6">
                {/* Role Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {selectedRole.name} - Role Analysis
                    </CardTitle>
                    {selectedRole.description && (
                      <p className="text-sm text-muted-foreground">
                        {selectedRole.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div
                      className={cn(
                        "grid gap-4",
                        selectedRoleAvgPlacement === null
                          ? "grid-cols-3"
                          : "grid-cols-2 md:grid-cols-4",
                      )}
                    >
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {selectedRole.matchCount}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Games
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {Math.round(selectedRole.winRate * 100)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Win Rate
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedRole.playerCount}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Players
                        </div>
                      </div>
                      {selectedRoleAvgPlacement !== null && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {selectedRoleAvgPlacement}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Avg Placement
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Players Performance in This Role */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Player Performance as {selectedRole.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea>
                      <div className="flex max-h-[40vh] flex-col gap-2">
                        {Object.values(selectedRole.players)
                          .sort((a, b) => b.winRate - a.winRate)
                          .map((player, index) => {
                            const avgPlacement = formatPlacementDistribution(
                              player.placements,
                            );
                            return (
                              <div
                                key={player.id}
                                className="flex items-center justify-between rounded-lg border p-4"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="text-lg font-bold text-muted-foreground">
                                    #{index + 1}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <PlayerImage
                                      className="h-7 w-7 sm:h-10 sm:w-10"
                                      image={player.image}
                                      alt={player.name}
                                    />
                                    <div>
                                      <div className="flex items-center gap-2 font-semibold">
                                        {player.name}
                                        {player.isUser && (
                                          <Badge
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            You
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {player.totalMatches} games played
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-1 text-right">
                                  <div className="text-xl font-bold">
                                    {Math.round(player.winRate * 100)}%
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-green-600">
                                      {player.totalWins} wins
                                    </span>
                                    {avgPlacement !== null && (
                                      <span className="text-blue-600">
                                        {avgPlacement} avg place
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="combos" className="space-y-6">
            {/* Global Role Combos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shuffle className="h-5 w-5" />
                  All Role Combinations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea>
                  <div className="flex max-h-[40vh] flex-col gap-2">
                    {roleCombos
                      .sort((a, b) => {
                        if (a.matchCount > 10 && b.matchCount > 10) {
                          return b.winRate - a.winRate;
                        }
                        return b.matchCount - a.matchCount;
                      })
                      .map((combo, index) => {
                        const avgPlacement = formatPlacementDistribution(
                          combo.placements,
                        );
                        return (
                          <div key={index} className="rounded-lg border p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="text-lg font-bold text-muted-foreground">
                                  #{index + 1}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {combo.roles.map((role, roleIndex) => (
                                    <div
                                      key={role.id}
                                      className="flex items-center gap-1"
                                    >
                                      <Badge
                                        variant="outline"
                                        className="text-sm"
                                      >
                                        {role.name}
                                      </Badge>
                                      {roleIndex < combo.roles.length - 1 && (
                                        <span className="text-muted-foreground">
                                          +
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <Badge
                                variant={
                                  combo.winRate >= 0.5 ? "default" : "secondary"
                                }
                              >
                                {Math.round(combo.winRate * 100)}% Win Rate
                              </Badge>
                            </div>

                            <div
                              className={cn(
                                "grid grid-cols-2 gap-4 text-sm md:grid-cols-4",
                                avgPlacement !== null && "md:grid-cols-5",
                              )}
                            >
                              <div>
                                <span className="text-muted-foreground">
                                  Games:
                                </span>
                                <div className="font-medium">
                                  {combo.matchCount}
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Wins:
                                </span>
                                <div className="font-medium text-green-600">
                                  {combo.wins}
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Losses:
                                </span>
                                <div className="font-medium text-red-600">
                                  {combo.losses}
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Win Rate:
                                </span>
                                <div className="font-medium">
                                  {Math.round(combo.winRate * 100)}%
                                </div>
                              </div>
                              {avgPlacement !== null && (
                                <div>
                                  <span className="text-muted-foreground">
                                    Avg Placement:
                                  </span>
                                  <div className="font-medium">
                                    {avgPlacement}
                                  </div>
                                </div>
                              )}
                            </div>

                            <Progress
                              value={combo.winRate * 100}
                              className="mt-3"
                            />

                            {/* Show role descriptions if available */}
                            {combo.roles.some((role) => role.description) && (
                              <div className="mt-3 border-t pt-3">
                                <div className="space-y-1 text-xs text-muted-foreground">
                                  {combo.roles
                                    .filter((role) => role.description)
                                    .map((role) => (
                                      <div key={role.id}>
                                        <strong>{role.name}:</strong>{" "}
                                        {role.description}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
const formatPlacementDistribution = (placements: Record<number, number>) => {
  const total = Object.values(placements).reduce(
    (sum, count) => sum + count,
    0,
  );
  if (total === 0) return null;

  const avgPlacement =
    Object.entries(placements).reduce((sum, [place, count]) => {
      return sum + Number.parseInt(place) * count;
    }, 0) / total;
  if (avgPlacement === 0) return null;

  return avgPlacement.toFixed(1);
};
