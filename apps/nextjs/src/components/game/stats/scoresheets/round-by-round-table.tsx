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
import { useScoresheetStats } from "~/hooks/game-stats/use-scoresheet-stats";

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type Player = GameStats["players"][number];
type Scoresheet = GameStats["scoresheets"][number];

export function RoundByRoundTable({
  players,
  scoresheets,
}: {
  players: Player[];
  scoresheets: Scoresheet[];
}) {
  const { currentScoresheet, currentPlayers } = useScoresheetStats({
    players,
    scoresheets,
  });

  if (!currentScoresheet || currentScoresheet.rounds.length <= 1) {
    return null;
  }

  const sortedRounds = useMemo(
    () => [...currentScoresheet.rounds].sort((a, b) => a.order - b.order),
    [currentScoresheet.rounds],
  );

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
              <TableRow>
                <TableHead className="w-16 px-2 sm:w-full sm:px-4">
                  Player
                </TableHead>
                {sortedRounds.map((round) => (
                    <TableHead
                      key={round.id}
                      className="min-w-[100px] text-center"
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
              {currentPlayers
                .toSorted((a, b) => b.plays - a.plays)
                .map((player) => (
                  <TableRow key={`${player.id}-${player.type}`}>
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
                            {`(${player.plays} games)`}
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
                        const playerRound = player.rounds.find(
                          (r) => r.id === round.id,
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
