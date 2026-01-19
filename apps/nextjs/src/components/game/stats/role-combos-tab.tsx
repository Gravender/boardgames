"use client";

import { Shuffle } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { Progress } from "@board-games/ui/progress";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { cn } from "@board-games/ui/utils";

import { useRoleStats } from "~/hooks/game-stats/use-role-stats";

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type RoleCombos = GameStats["roleCombos"];

export function RoleCombosTab({
  roleCombos,
}: {
  roleCombos: RoleCombos;
}) {
  const { formatPlacementDistribution } = useRoleStats({
    roleStats: [],
    userStats: undefined,
    players: [],
  });

  return (
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
                if (a.matchCount > 10 && b.matchCount <= 10) {
                  return 1;
                }
                if (a.matchCount <= 10 && b.matchCount > 10) {
                  return -1;
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
                        <div className="text-muted-foreground text-lg font-bold">
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
                        <span className="text-muted-foreground">Games:</span>
                        <div className="font-medium">{combo.matchCount}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Wins:</span>
                        <div className="font-medium text-green-600">
                          {combo.wins}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Losses:</span>
                        <div className="font-medium text-red-600">
                          {combo.losses}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Win Rate:</span>
                        <div className="font-medium">
                          {Math.round(combo.winRate * 100)}%
                        </div>
                      </div>
                      {avgPlacement !== null && (
                        <div>
                          <span className="text-muted-foreground">
                            Avg Placement:
                          </span>
                          <div className="font-medium">{avgPlacement}</div>
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
                        <div className="text-muted-foreground space-y-1 text-xs">
                          {combo.roles
                            .filter((role) => role.description)
                            .map((role) => (
                              <div key={role.id}>
                                <strong>{role.name}:</strong> {role.description}
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
  );
}
