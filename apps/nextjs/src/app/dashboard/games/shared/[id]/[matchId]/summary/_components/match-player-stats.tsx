import { ArrowDown, ArrowUp, Trophy } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { getOrdinalSuffix } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@board-games/ui/table";

type playerStats = NonNullable<
  RouterOutputs["match"]["getSummary"]
>["playerStats"];
type Scoresheet = NonNullable<
  RouterOutputs["match"]["getSummary"]
>["scoresheet"];
export default function MatchSummaryPlayerStats({
  playerStats,
  scoresheet,
}: {
  scoresheet: Scoresheet;
  playerStats: playerStats;
}) {
  // Sort players by number of wins (highest first)
  const sortedStats = [...playerStats].sort((a, b) => b.wins - a.wins);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Player Statistics</CardTitle>
      </CardHeader>
      <CardContent className="p-2 md:p-6">
        <Table
          className="min-w-full"
          containerClassname="max-h-[65vh] h-fit w-full rounded-lg"
        >
          <TableHeader className="bg-sidebar sticky top-0 z-20 text-card-foreground shadow-lg">
            <TableRow>
              <TableHead className="bg-sidebar sticky left-0">Player</TableHead>
              <TableHead className="text-center">Games</TableHead>
              <TableHead className="text-center">Wins</TableHead>
              <TableHead className="text-center">Win Rate</TableHead>
              <TableHead className="hidden text-center lg:table-cell">
                Avg Score
              </TableHead>
              <TableHead className="hidden text-center lg:table-cell">
                Top Placement
              </TableHead>
              {scoresheet.winCondition !== "Manual" && (
                <>
                  <TableHead className="hidden text-center md:table-cell">
                    Best
                  </TableHead>
                  <TableHead className="hidden text-center md:table-cell">
                    Worst
                  </TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStats.map((player) => {
              // Calculate average score
              const avgScore =
                player.scores.length > 0
                  ? player.scores.reduce((sum, score) => sum + score, 0) /
                    player.scores.length
                  : 0;
              const highestScore = Math.max(...player.scores);
              const lowestScore = Math.min(...player.scores);
              let Best: number | null = null;
              let Worst: number | null = null;
              if (scoresheet.winCondition === "Highest Score") {
                Best = highestScore;
                Worst = lowestScore;
              }
              if (scoresheet.winCondition === "Lowest Score") {
                Best = lowestScore;
                Worst = highestScore;
              }
              if (scoresheet.winCondition === "Target Score") {
                const foundScore = player.scores.find(
                  (score) => score === scoresheet.targetScore,
                );
                Best = foundScore ? scoresheet.targetScore : null;
                const differenceHighest = highestScore - scoresheet.targetScore;
                const differenceLowest = lowestScore - scoresheet.targetScore;
                if (differenceLowest == 0 && differenceHighest == 0)
                  Worst = null;
                else if (differenceLowest == 0) Worst = highestScore;
                else if (differenceHighest == 0) Worst = lowestScore;
              }

              // Calculate win rate
              const winRate =
                player.plays > 0 ? (player.wins / player.plays) * 100 : 0;

              // Find top placement
              const placements = Object.entries(player.placements)
                .map(([placement, count]) => ({
                  placement: Number(placement),
                  count,
                }))
                .sort((a, b) => a.placement - b.placement);

              const topPlacement =
                placements.length > 0 ? placements[0]?.placement : null;

              return (
                <TableRow key={player.id}>
                  <TableCell className="sticky left-0 z-10 bg-card font-semibold text-muted-foreground after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border">
                    <div className="flex items-center gap-2">
                      {player.name}
                      {player.type === "shared" && (
                        <Badge variant="outline" className="text-xs">
                          Shared
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{player.plays}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {player.wins}
                      {player.wins > 0 && (
                        <Trophy className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {winRate.toFixed(1)}%
                  </TableCell>
                  <TableCell className="hidden text-center lg:table-cell">
                    {avgScore.toFixed(1)}
                  </TableCell>
                  <TableCell className="hidden text-center lg:table-cell">
                    {topPlacement
                      ? `${topPlacement}${getOrdinalSuffix(topPlacement)}`
                      : "-"}
                  </TableCell>
                  {scoresheet.winCondition !== "Manual" && (
                    <>
                      <TableCell className="hidden text-center md:table-cell">
                        {Best ?? ""}
                      </TableCell>
                      <TableCell className="hidden text-center md:table-cell">
                        {Worst ?? ""}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
