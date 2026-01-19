"use client";

import { BarChart3, Shuffle, Star } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@board-games/ui/chart";
import { Progress } from "@board-games/ui/progress";

import { useRoleStats } from "~/hooks/game-stats/use-role-stats";

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type RoleStats = GameStats["roleStats"][number];
type PlayerStats = GameStats["players"][number];

export function RoleOverviewTab({
  roleStats,
  userStats,
}: {
  roleStats: RoleStats[];
  userStats: PlayerStats | undefined;
}) {
  const { topFiveRoles, roleRecommendations, bestRoleCombos, formatPlacementDistribution } =
    useRoleStats({
      roleStats,
      userStats,
      players: userStats ? [] : [],
    });

  return (
    <>
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
                    color: `var(--chart-${(index % 5) + 1})`,
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
                    fill="var(--chart-1)"
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
                    color: `var(--chart-${index + 1})`,
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
                    fill="var(--chart-1)"
                    dataKey="matchCount"
                  >
                    {roleStats.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`var(--chart-${index + 1})`}
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
                    <p className="text-muted-foreground mb-2 text-xs">
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
                      <span className="text-muted-foreground">Games:</span>
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
                    <div className="text-muted-foreground text-xs">
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
    </>
  );
}
