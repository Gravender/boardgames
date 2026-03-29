"use client";

import { FileText } from "lucide-react";

import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";

import type { GameInput } from "~/components/match/types/input";
import { useScoresheetStats } from "~/hooks/game-stats/use-scoresheet-stats";
import { useGameScoresheetStats } from "~/hooks/queries/game/game-scoresheet-stats";
import { RoundByRoundTable } from "./round-by-round-table";
import { ScoresheetCharts } from "./scoresheet-charts";
import { ScoresheetPlayerTable } from "./scoresheet-player-table";

export function ScoreSheetsStats({ game }: { game: GameInput }) {
  const scoresheetStats = useGameScoresheetStats(game);
  const {
    currentScoresheet,
    setCurrentScoresheet,
    getScoresheetKey,
    userScore,
    sortedPlayers,
    toggleSort,
    sortField,
    sortOrder,
    userScoresSorted,
    winRateOverTime,
  } = useScoresheetStats({
    scoresheetStats,
  });

  if (!currentScoresheet) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-muted-foreground text-center">
            No scoresheets available for analysis.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scoresheet Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Scoresheet Analysis - {currentScoresheet.name}
          </CardTitle>
        </CardHeader>
        {scoresheetStats.length > 1 && (
          <CardContent>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium">
                  Select Scoresheet:
                </label>
                <Select
                  value={getScoresheetKey(currentScoresheet)}
                  onValueChange={(value) => {
                    const selectedScoresheet = scoresheetStats.find(
                      (s) => getScoresheetKey(s) === value,
                    );
                    if (selectedScoresheet) {
                      setCurrentScoresheet(selectedScoresheet);
                    }
                  }}
                >
                  <SelectTrigger className="w-full sm:w-96">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <span>{currentScoresheet.name}</span>
                        <Badge
                          variant={
                            currentScoresheet.isCoop ? "secondary" : "default"
                          }
                        >
                          {currentScoresheet.isCoop
                            ? "Cooperative"
                            : "Competitive"}
                        </Badge>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {scoresheetStats.map((scoresheet) => (
                      <SelectItem
                        key={getScoresheetKey(scoresheet)}
                        value={getScoresheetKey(scoresheet)}
                      >
                        <div className="flex items-center gap-2">
                          <span>{scoresheet.name}</span>
                          <Badge
                            variant={
                              scoresheet.isCoop ? "secondary" : "default"
                            }
                            className="text-xs"
                          >
                            {scoresheet.isCoop ? "Co-op" : "Competitive"}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            ({scoresheet.rounds.length} rounds)
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {scoresheet.plays} plays
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Scoresheet Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Type:</span>
                <div className="font-semibold">
                  {currentScoresheet.type === "original"
                    ? "Original"
                    : "Shared"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Mode:</span>
                <div className="font-semibold">
                  {currentScoresheet.isCoop ? "Co-operative" : "Competitive"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Win Condition:</span>
                <div className="font-semibold">
                  {currentScoresheet.winCondition}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Rounds:</span>
                <div className="font-semibold">
                  {currentScoresheet.rounds.length}
                </div>
              </div>
            </div>
            {currentScoresheet.winCondition === "Target Score" && (
              <div className="border-t pt-2">
                <span className="text-muted-foreground text-sm">
                  Target Score:
                </span>
                <div className="text-primary text-lg font-bold">
                  {currentScoresheet.targetScore}
                </div>
              </div>
            )}
            {currentScoresheet.avgScore != null &&
              currentScoresheet.winCondition !== "Manual" &&
              currentScoresheet.winCondition !== "No Winner" && (
                <div className="space-y-2 border-t pt-2">
                  <div>
                    <span className="text-muted-foreground text-sm">
                      Overall average final score:
                    </span>
                    <div className="font-semibold">
                      {currentScoresheet.avgScore.toFixed(1)}
                    </div>
                  </div>
                  {currentScoresheet.winningAvgScore != null && (
                    <div>
                      <span className="text-muted-foreground text-sm">
                        Average score when winning:
                      </span>
                      <div className="font-semibold text-green-600">
                        {currentScoresheet.winningAvgScore.toFixed(1)}
                      </div>
                    </div>
                  )}
                </div>
              )}
          </CardContent>
        </Card>

        {userScore ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Your Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Matches Played:</span>
                  <div className="font-semibold">{userScore.numMatches}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Games Won:</span>
                  <div className="font-semibold text-green-600">
                    {userScore.wins}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Win Rate:</span>
                  <div className="font-semibold">
                    {Math.round(userScore.winRate * 100)}%
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg Score:</span>
                  <div className="font-semibold">
                    {userScore.avgScore ? userScore.avgScore.toFixed(1) : "N/A"}
                  </div>
                </div>
              </div>
              {(currentScoresheet.winCondition === "Highest Score" ||
                currentScoresheet.winCondition === "Lowest Score") && (
                <div className="border-t pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">
                      Score Range:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-green-600">
                        {userScore.bestScore ?? "N/A"}
                      </span>
                      <span className="text-muted-foreground">-</span>
                      <span className="font-semibold text-red-600">
                        {userScore.worstScore ?? "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Your Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <span className="text-base">
                Haven't played any games with this scoresheet yet.
              </span>
            </CardContent>
          </Card>
        )}
      </div>

      <ScoresheetPlayerTable
        currentScoresheet={currentScoresheet}
        sortedPlayers={sortedPlayers}
        toggleSort={toggleSort}
        sortField={sortField}
        sortOrder={sortOrder}
      />
      <ScoresheetCharts
        currentScoresheet={currentScoresheet}
        userScore={userScore}
        userScoresSorted={userScoresSorted}
        winRateOverTime={winRateOverTime}
      />
      <RoundByRoundTable currentScoresheet={currentScoresheet} />
    </div>
  );
}
