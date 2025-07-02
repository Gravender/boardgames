import { useMemo, useState } from "react";
import { compareAsc, format } from "date-fns";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  FileText,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@board-games/ui/table";

import { PlayerImage } from "~/components/player-image";

type Player = NonNullable<
  RouterOutputs["game"]["getGameStats"]
>["players"][number];
type Scoresheet = NonNullable<
  RouterOutputs["game"]["getGameStats"]
>["scoresheets"][number];
type SortField =
  | "name"
  | "plays"
  | "wins"
  | "winRate"
  | "bestScore"
  | "worstScore"
  | "avgScore";
type SortOrder = "asc" | "desc";
export function ScoreSheetsStats({
  players,
  scoresheets,
}: {
  players: Player[];
  scoresheets: Scoresheet[];
}) {
  const [currentScoresheet, setCurrentScoresheet] = useState<Scoresheet | null>(
    scoresheets
      .map((s) => {
        const plays = players.reduce((acc, p) => {
          const foundScoresheet = p.scoresheets.find((ps) => ps.id === s.id);
          if (foundScoresheet !== undefined) {
            return Math.max(acc, foundScoresheet.plays);
          }
          return acc;
        }, 0);
        if (plays === 0) {
          return null;
        }
        return {
          ...s,
          plays,
        };
      })
      .find((s) => s !== null) ?? null,
  );
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const currentPlayers = useMemo(() => {
    if (!currentScoresheet) return [];
    const mappedPlayers = players
      .map((player) => {
        const playerScoresheet = player.scoresheets.find(
          (pScoresheet) => pScoresheet.id === currentScoresheet.id,
        );
        if (!playerScoresheet) return null;

        return {
          id: player.id,
          type: player.type,
          name: player.name,
          image: player.image,
          isUser: player.isUser,
          bestScore: playerScoresheet.bestScore,
          worstScore: playerScoresheet.worstScore,
          avgScore: playerScoresheet.avgScore,
          winRate: playerScoresheet.winRate,
          plays: playerScoresheet.plays,
          wins: playerScoresheet.wins,
          rounds: playerScoresheet.rounds,
          scores: playerScoresheet.scores,
        };
      })
      .filter((player) => player !== null);
    return mappedPlayers;
  }, [currentScoresheet, players]);

  const userScore = useMemo(() => {
    const temp = currentPlayers.find((p) => p.isUser);
    return temp ?? null;
  }, [currentPlayers]);
  const sortedPlayers = useMemo(() => {
    const temp = [...currentPlayers];
    temp.sort((a, b) => {
      let aValue: number | string | null;
      let bValue: number | string | null;

      switch (sortField) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "plays":
          aValue = a.plays;
          bValue = b.plays;
          break;
        case "wins":
          aValue = a.wins;
          bValue = b.wins;
          break;
        case "winRate":
          aValue = a.winRate;
          bValue = b.winRate;
          break;
        case "bestScore":
          aValue = a.bestScore;
          bValue = b.bestScore;
          break;
        case "worstScore":
          aValue = a.worstScore;
          bValue = b.worstScore;
          break;
        case "avgScore":
          aValue = a.avgScore;
          bValue = b.avgScore;
          break;
        default:
          aValue = a.winRate;
          bValue = b.winRate;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      if (sortField.includes("Score")) {
        if (currentScoresheet?.winCondition === "Lowest Score") {
          return sortOrder === "asc"
            ? (aValue as number) - (bValue as number)
            : (bValue as number) - (aValue as number);
        }
        if (currentScoresheet?.winCondition === "Highest Score") {
          return sortOrder === "asc"
            ? (bValue as number) - (aValue as number)
            : (aValue as number) - (bValue as number);
        }
      }
      return sortOrder === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
    return temp;
  }, [currentPlayers, currentScoresheet?.winCondition, sortField, sortOrder]);
  const scoreSheetsWithGames = useMemo(() => {
    const temp = [...scoresheets];
    return temp
      .map((s) => {
        const plays = players.reduce((acc, p) => {
          const foundScoresheet = p.scoresheets.find((ps) => ps.id === s.id);
          if (foundScoresheet !== undefined) {
            return Math.max(acc, foundScoresheet.plays);
          }
          return acc;
        }, 0);
        if (plays === 0) {
          return null;
        }
        return {
          ...s,
          plays,
        };
      })
      .filter((s) => s !== null);
  }, [players, scoresheets]);
  const toggleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <div className="ml-1 h-3 w-3 sm:ml-2 sm:h-4 sm:w-4" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3 sm:ml-2 sm:h-4 sm:w-4" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3 sm:ml-2 sm:h-4 sm:w-4" />
    );
  };
  const userScoresSorted = useMemo(() => {
    if (!userScore) return [];
    return userScore.scores
      .toSorted((a, b) => compareAsc(a.date, b.date))
      .map((score) => ({
        ...score,
        date: format(score.date, "MMMM d, yyyy"),
      }));
  }, [userScore]);
  const winRateOverTime = () => {
    let wins = 0;
    let totalGames = 0;
    const winRateOverTime = userScoresSorted.map((score) => {
      if (score.isWin) {
        wins++;
      }
      totalGames++;
      return {
        date: score.date,
        winRate: (wins / totalGames) * 100,
      };
    });
    return winRateOverTime;
  };
  if (!currentScoresheet) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
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
        {scoreSheetsWithGames.length > 1 && (
          <CardContent>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium">
                  Select Scoresheet:
                </label>
                <Select
                  value={currentScoresheet.id.toString()}
                  onValueChange={(value) => {
                    const selectedScoresheet = scoresheets.find(
                      (s) => s.id === Number.parseInt(value),
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
                    {scoreSheetsWithGames.map((scoresheet) => (
                      <SelectItem
                        key={scoresheet.id}
                        value={scoresheet.id.toString()}
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
                          <span className="text-xs text-muted-foreground">
                            ({scoresheet.rounds.length} rounds)
                          </span>
                          <span className="text-xs text-muted-foreground">
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
                <span className="text-sm text-muted-foreground">
                  Target Score:
                </span>
                <div className="text-lg font-bold text-primary">
                  {currentScoresheet.targetScore}
                </div>
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
                  <div className="font-semibold">{userScore.plays}</div>
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
              <div className="border-t pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
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

      {/* Player Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Player Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="flex">
            <Table containerClassname=" overflow-scroll max-h-[35vh] rounded-lg">
              <TableHeader className="bg-sidebar sticky top-0 z-20 text-card-foreground">
                <TableRow>
                  <TableHead className="w-16 px-2 sm:w-full sm:px-4">
                    <button
                      onClick={() => toggleSort("name")}
                      className="flex items-center font-bold"
                    >
                      <span>Player</span>
                      <SortIcon field="name" />
                    </button>
                  </TableHead>
                  <TableHead className="w-8 px-0 sm:px-4">
                    <button
                      onClick={() => toggleSort("plays")}
                      className="flex items-center font-bold"
                    >
                      <span>Plays</span>
                      <SortIcon field="plays" />
                    </button>
                  </TableHead>
                  <TableHead className="w-8 px-0 sm:px-4">
                    <button
                      onClick={() => toggleSort("wins")}
                      className="flex items-center font-bold"
                    >
                      <span>Wins</span>
                      <SortIcon field="wins" />
                    </button>
                  </TableHead>
                  <TableHead className="w-16 px-1 sm:px-4">
                    <button
                      onClick={() => toggleSort("winRate")}
                      className="flex items-center font-bold"
                    >
                      <span className="flex w-16">Win Rate</span>
                      <SortIcon field="winRate" />
                    </button>
                  </TableHead>
                  {!(
                    currentScoresheet.winCondition === "Manual" ||
                    currentScoresheet.winCondition === "No Winner"
                  ) && (
                    <>
                      <TableHead className="w-16 px-1 sm:px-4">
                        <button
                          onClick={() => toggleSort("avgScore")}
                          className="flex items-center font-bold"
                        >
                          <span className="flex w-16">Avg Score</span>
                          <SortIcon field="avgScore" />
                        </button>
                      </TableHead>
                      <TableHead className="w-16 px-1 sm:px-4">
                        <button
                          onClick={() => toggleSort("bestScore")}
                          className="flex items-center font-bold"
                        >
                          <span className="flex w-16">Best Score</span>
                          <SortIcon field="bestScore" />
                        </button>
                      </TableHead>
                      <TableHead className="w-16 px-1 sm:px-4">
                        <button
                          onClick={() => toggleSort("worstScore")}
                          className="flex items-center font-bold"
                        >
                          <span className="flex w-16">Worst Score</span>
                          <SortIcon field="worstScore" />
                        </button>
                      </TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPlayers.map((player) => (
                  <TableRow key={`${player.id}-${player.type}`}>
                    <TableCell className="p-2 sm:p-4">
                      <div className="flex w-full items-center gap-2 text-xs sm:gap-4">
                        <PlayerImage
                          className="h-7 w-7 sm:h-10 sm:w-10"
                          image={player.image}
                          alt={player.name}
                        />
                        <span className="font-medium sm:font-semibold">
                          {player.name}
                        </span>
                        {player.type === "shared" && (
                          <>
                            <Badge
                              variant="outline"
                              className="bg-blue-600 px-1 text-xs text-white"
                            >
                              S
                            </Badge>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {player.plays}
                    </TableCell>
                    <TableCell className="text-center font-medium text-green-600">
                      {player.wins}
                    </TableCell>
                    <TableCell>{Math.round(player.winRate * 100)}%</TableCell>
                    {!(
                      currentScoresheet.winCondition === "Manual" ||
                      currentScoresheet.winCondition === "No Winner"
                    ) && (
                      <>
                        <TableCell className="text-center font-semibold">
                          {player.avgScore ? player.avgScore.toFixed(1) : "N/A"}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-green-600">
                          {player.bestScore ?? "N/A"}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-red-600">
                          {player.worstScore ?? "N/A"}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Scoresheet Performance Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Score Trends Chart */}
        {userScoresSorted.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Score Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  score: {
                    label: "Score",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="max-h-64 w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={userScoresSorted}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="var(--color-score)"
                      strokeWidth={2}
                      dot={{ fill: "var(--color-score)", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Win Rate Over Time Chart */}
        {userScore && userScore.scores.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Win Rate Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  winRate: {
                    label: "Win Rate (%)",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="max-h-64 w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={winRateOverTime()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="winRate"
                      stroke="var(--color-winRate)"
                      fill="var(--color-winRate)"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Round by Round Performance */}
      {currentScoresheet.rounds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Round-by-Round Performance
            </CardTitle>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              Scoresheet: {currentScoresheet.name} (
              {currentScoresheet.isCoop ? "Co-op" : "Competitive"})
            </div>
          </CardHeader>
          <CardContent className="p-2">
            <div className="flex">
              <Table containerClassname=" overflow-scroll max-h-[35vh] rounded-lg">
                <TableHeader className="bg-sidebar sticky top-0 z-20 text-card-foreground">
                  <TableRow>
                    <TableHead className="w-16 px-2 sm:w-full sm:px-4">
                      Player
                    </TableHead>
                    {currentScoresheet.rounds
                      .sort((a, b) => a.order - b.order)
                      .map((round) => (
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
                              <div className="text-xs text-muted-foreground">
                                {`(${player.plays} games)`}
                              </div>
                            </div>
                            {player.type === "shared" && (
                              <>
                                <Badge
                                  variant="outline"
                                  className="bg-blue-600 px-1 text-xs text-white"
                                >
                                  S
                                </Badge>
                              </>
                            )}
                          </div>
                        </TableCell>
                        {currentScoresheet.rounds
                          .sort((a, b) => a.order - b.order)
                          .map((round) => {
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
                                      <div className="text-xs text-muted-foreground">
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
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                            );
                          })}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              <p>
                Shows average scores per round based on the selected scoresheet.
                Round data is linked to specific scoresheets.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
