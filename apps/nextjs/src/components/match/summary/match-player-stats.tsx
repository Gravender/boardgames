"use client";

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

import { useMatchSummary, useScoresheet } from "../hooks/suspenseQueries";

export function MatchSummaryPlayerStats({
  id,
  type,
}: {
  id: number;
  type: "original" | "shared";
}) {
  const { summary } = useMatchSummary(id, type);
  const { scoresheet } = useScoresheet(id, type);
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
              <TableHead className="hidden text-center md:table-cell">
                Win Rate
              </TableHead>
              {scoresheet.winCondition !== "Manual" && (
                <>
                  <TableHead className="hidden text-center lg:table-cell">
                    Avg Score
                  </TableHead>
                  <TableHead className="hidden text-center lg:table-cell">
                    Top Placement
                  </TableHead>
                  <TableHead className="text-center">Best</TableHead>
                  <TableHead className="text-center">Worst</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.playerStats.map((player) => {
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
                <TableRow key={player.id} className="base:text-sm text-xs">
                  <TableCell className="sticky left-0 z-10 max-w-24 bg-card font-semibold text-muted-foreground after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border sm:max-w-32">
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
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-center md:table-cell">
                    {winRate.toFixed(1)}%
                  </TableCell>
                  {scoresheet.winCondition !== "Manual" && (
                    <>
                      <TableCell className="hidden text-center lg:table-cell">
                        {avgScore.toFixed(1)}
                      </TableCell>
                      <TableCell className="hidden text-center lg:table-cell">
                        {topPlacement
                          ? `${topPlacement}${getOrdinalSuffix(topPlacement)}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {Best ?? ""}
                      </TableCell>
                      <TableCell className="text-center">
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
export function MatchSummaryPlayerStatsSkeleton() {
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
              <TableHead className="hidden text-center md:table-cell">
                Win Rate
              </TableHead>
              <TableHead className="hidden text-center lg:table-cell">
                Avg Score
              </TableHead>
              <TableHead className="hidden text-center lg:table-cell">
                Top Placement
              </TableHead>
              <TableHead className="text-center">Best</TableHead>
              <TableHead className="text-center">Worst</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, index) => (
              <TableRow key={index} className="base:text-sm text-xs">
                <TableCell className="sticky left-0 z-10 max-w-24 bg-card after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border sm:max-w-32">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="mx-auto h-4 w-8 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell className="text-center">
                  <div className="mx-auto h-4 w-6 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell className="hidden text-center md:table-cell">
                  <div className="mx-auto h-4 w-12 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell className="hidden text-center lg:table-cell">
                  <div className="mx-auto h-4 w-12 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell className="hidden text-center lg:table-cell">
                  <div className="mx-auto h-4 w-10 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell className="text-center">
                  <div className="mx-auto h-4 w-8 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell className="text-center">
                  <div className="mx-auto h-4 w-8 animate-pulse rounded bg-muted" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
