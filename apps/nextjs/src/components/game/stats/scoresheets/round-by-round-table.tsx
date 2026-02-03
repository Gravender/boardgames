"use client";

import { useMemo } from "react";
import { BarChart3, FileText } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
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

import { PlayerImage } from "~/components/player-image";
import { getCurrentPlayerKey } from "~/hooks/game-stats/use-scoresheet-stats";

type ScoresheetStatsItem =
  RouterOutputs["newGame"]["getGameScoresheetStats"][number];

export function RoundByRoundTable({
  currentScoresheet,
}: {
  currentScoresheet: ScoresheetStatsItem;
}) {
  const sortedRounds = useMemo(
    () => [...currentScoresheet.rounds].sort((a, b) => a.order - b.order),
    [currentScoresheet.rounds],
  );

  if (sortedRounds.length <= 1) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Round-by-Round Performance
        </CardTitle>

        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4" />
          Scoresheet: {currentScoresheet.name} (
          {currentScoresheet.isCoop ? "Co-op" : "Competitive"})
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <div className="flex">
          <Table containerClassname=" overflow-scroll max-h-[35vh] rounded-lg">
            <TableHeader className="bg-sidebar text-card-foreground sticky top-0 z-20">
              <TableRow className="">
                <TableHead className="w-16 px-2 py-2 sm:w-full sm:px-4">
                  Player
                </TableHead>
                {sortedRounds.map((round) => (
                  <TableHead
                    key={round.id}
                    className="min-w-[100px] py-2 text-center"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span>{round.name}</span>
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          borderColor: round.color ?? "",
                          color: round.color ?? "",
                        }}
                      >
                        {round.type}
                        {round.type === "Checkbox" && ` (${round.score})`}
                      </Badge>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="font-medium">
                <TableCell className="p-2 sm:p-4">
                  <span className="text-sm">Round average</span>
                </TableCell>
                {sortedRounds.map((round) => (
                  <TableCell key={round.id} className="text-center">
                    {round.type === "Numeric" ? (
                      <div className="space-y-1 text-xs">
                        <div>
                          <span className="text-muted-foreground">Avg: </span>
                          <span className="font-semibold">
                            {round.avgScore != null
                              ? round.avgScore.toFixed(1)
                              : "-"}
                          </span>
                        </div>
                        {round.volatility != null && (
                          <div className="text-muted-foreground">
                            σ: {round.volatility.toFixed(1)}
                          </div>
                        )}
                        {round.winningAvgScore != null && (
                          <div className="text-muted-foreground">
                            Winning avg: {round.winningAvgScore.toFixed(1)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1 text-xs">
                        <div>
                          <span className="text-muted-foreground">
                            Checked:{" "}
                          </span>
                          <span className="font-semibold">
                            {round.checkRate != null
                              ? `${round.checkRate.toFixed(0)}%`
                              : "-"}
                          </span>
                        </div>
                        {round.winningCheckRate != null && (
                          <div className="text-muted-foreground">
                            Winning: {round.winningCheckRate.toFixed(0)}%
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                ))}
              </TableRow>
              {currentScoresheet.players
                .toSorted((a, b) => b.numMatches - a.numMatches)
                .map((player) => (
                  <TableRow key={getCurrentPlayerKey(player)}>
                    <TableCell className="p-2 sm:p-4">
                      <div className="flex w-full items-center gap-2 text-xs sm:gap-4">
                        <PlayerImage
                          className="h-7 w-7 sm:h-10 sm:w-10"
                          image={player.image}
                          alt={player.name}
                        />
                        <div className="flex flex-col gap-2">
                          <span className="font-medium sm:font-semibold">
                            {player.name}
                          </span>
                          <div className="text-muted-foreground text-xs">
                            {`(${player.numMatches} games)`}
                          </div>
                        </div>
                        {player.type === "shared" && (
                          <Badge
                            variant="outline"
                            className="bg-blue-600 px-1 text-xs text-white"
                          >
                            S
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {sortedRounds.map((round) => {
                      const playerRound = round.players.find(
                        (p) =>
                          (player.type === "original" &&
                            p.type === "original" &&
                            p.playerId === player.playerId) ||
                          (player.type === "shared" &&
                            p.type === "shared" &&
                            p.sharedId === player.sharedId),
                      );
                      const checkedRounds =
                        playerRound?.scores.filter(
                          (s) => s.score === round.score,
                        ).length ?? 0;
                      return (
                        <TableCell key={round.id} className="text-center">
                          {playerRound ? (
                            round.type === "Numeric" ? (
                              <div className="space-y-1">
                                <div className="font-semibold">
                                  {playerRound.avgScore
                                    ? playerRound.avgScore.toFixed(1)
                                    : "N/A"}
                                </div>
                                <div className="flex items-center justify-center gap-1 text-xs">
                                  <span className="text-green-600">
                                    {playerRound.bestScore ?? "N/A"}
                                  </span>
                                  <span className="text-muted-foreground">
                                    /
                                  </span>
                                  <span className="text-red-600">
                                    {playerRound.worstScore ?? "N/A"}
                                  </span>
                                </div>
                                <div className="text-muted-foreground text-xs">
                                  {`${
                                    playerRound.scores.filter(
                                      (s) => s.score !== null,
                                    ).length
                                  } games`}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="text-xs font-semibold">
                                  {`${checkedRounds} time${checkedRounds !== 1 ? "s" : ""}`}
                                </div>
                              </div>
                            )
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        <div className="text-muted-foreground mt-4 text-sm">
          <p>
            Shows average scores per round based on the selected scoresheet.
            Round data is linked to specific scoresheets.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
