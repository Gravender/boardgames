"use client";

import { UserCheck } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { Progress } from "@board-games/ui/progress";
import { ScrollArea } from "@board-games/ui/scroll-area";

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type PlayerStats = GameStats["players"][number];

function getAveragePlacement(placements: Record<number, number>): number {
  let totalPlacements = 0;
  let totalCount = 0;

  for (const [placementStr, count] of Object.entries(placements)) {
    const placement = Number(placementStr);
    totalPlacements += placement * count;
    totalCount += count;
  }

  return totalCount === 0 ? 0 : totalPlacements / totalCount;
}

export function RolePerformanceSection({
  userStats,
}: {
  userStats: PlayerStats | undefined;
}) {
  if (!userStats || userStats.roles.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Role Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-4">
        <ScrollArea>
          <div className="flex max-h-[40vh] w-full flex-col gap-2">
            {userStats.roles
              .sort((a, b) => {
                if (a.matchCount > 10 && b.matchCount > 10) {
                  return b.winRate - a.winRate;
                }
                return b.matchCount - a.matchCount;
              })
              .map((role) => {
                const averagePlacement = getAveragePlacement(
                  role.placements,
                );
                return (
                  <div key={role.roleId} className="rounded-lg border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold">{role.name}</h3>
                      <Badge
                        variant={
                          role.winRate >= 0.5 ? "default" : "secondary"
                        }
                      >
                        {Math.round(role.winRate * 100)}% Win Rate
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Matches:
                        </span>
                        <div className="font-medium">{role.matchCount}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Wins:</span>
                        <div className="font-medium">{role.wins}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Avg Placement:
                        </span>
                        <div className="font-medium">
                          {averagePlacement.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <Progress value={role.winRate * 100} className="mt-2" />
                  </div>
                );
              })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
