"use client";

import { Award, Medal, Trophy, Users } from "lucide-react";

import type { OriginalRole, SharedRole } from "@board-games/shared";
import { getOrdinalSuffix, isSameRole } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Separator } from "@board-games/ui/separator";
import { Skeleton } from "@board-games/ui/skeleton";
import { cn } from "@board-games/ui/utils";

import type { MatchInput } from "../types/input";
import { PlayerImage } from "~/components/player-image";
import {
  useMatchSummary,
  usePlayersAndTeams,
  useScoresheet,
} from "../hooks/suspenseQueries";

export function ShareMatchResults(input: { match: MatchInput }) {
  const { summary } = useMatchSummary(input.match);
  const { players, teams } = usePlayersAndTeams(input.match);
  const { scoresheet } = useScoresheet(input.match);

  const calculatePerformance = (player: (typeof players)[number]) => {
    if (player.score === null) return undefined;
    const foundPlayer = summary.playerStats.find(
      (p) => p.playerId === player.playerId,
    );

    if (!foundPlayer) return undefined;

    if (foundPlayer.firstMatch) return "First Game";
    const highestScore = Math.max(...foundPlayer.scores);
    const lowestScore = Math.min(...foundPlayer.scores);
    if (scoresheet.winCondition === "Highest Score") {
      if (player.score >= highestScore) return "Best Game";
      if (player.score === lowestScore) return "Worst Game";
    }
    if (scoresheet.winCondition === "Lowest Score") {
      if (player.score <= lowestScore) return "Best Game";
      if (player.score === highestScore) return "Worst Game";
    }
    if (scoresheet.winCondition === "Target Score") {
      if (player.score === scoresheet.targetScore) return "Perfect Game";
      return "Worst Game";
    }
    return undefined;
  };
  const playersWithoutTeams = players
    .filter((player) => player.teamId === null)
    .map((player) => ({
      ...player,
      performance: calculatePerformance(player),
      teamType: "Player" as const,
    }));
  const teamsWithTeams = teams
    .map((team) => {
      const teamPlayers = players.filter((player) => player.teamId === team.id);
      const [firstTeamPlayer] = teamPlayers;
      return {
        ...team,
        players: teamPlayers.map((player) => ({
          ...player,
          performance: calculatePerformance(player),
        })),
        placement: firstTeamPlayer?.placement ?? 0,
        score: firstTeamPlayer?.score ?? 0,
        winner: firstTeamPlayer?.winner ?? false,
        teamType: "Team" as const,
      };
    })
    .filter((team) => team.players.length > 0);
  const sortedPlayersAndTeams: (
    | ((typeof players)[number] & {
        teamType: "Player";
        performance: string | undefined;
      })
    | ((typeof teams)[number] & {
        teamType: "Team";
        placement: number;
        score: number;
        winner: boolean;
        players: ((typeof players)[number] & {
          performance: string | undefined;
        })[];
      })
  )[] = [...teamsWithTeams, ...playersWithoutTeams].toSorted((a, b) => {
    if (a.placement === b.placement) {
      return a.name.localeCompare(b.name);
    } else {
      if (a.placement === null) return -1;
      if (b.placement === null) return 1;
      return a.placement - b.placement;
    }
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Match Results</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-2 pt-0 sm:p-6">
        {sortedPlayersAndTeams.map((data) => {
          if (data.teamType === "Team") {
            const roles = data.players.reduce<(OriginalRole | SharedRole)[]>(
              (acc, player) => {
                if (player.roles.length > 0) {
                  player.roles.forEach((role) => {
                    const foundRole = acc.find((r) => isSameRole(r, role));
                    if (!foundRole) {
                      acc.push(role);
                    }
                  });
                }

                return acc;
              },
              [],
            );
            const teamRoles = roles.filter((role) => {
              return data.players.every((player) => {
                if ("roles" in player) {
                  const foundRole = player.roles.find((r) =>
                    isSameRole(r, role),
                  );
                  return foundRole !== undefined;
                }
                return false;
              });
            });
            return (
              <div
                key={data.id}
                className={cn(
                  "rounded-lg border p-4",
                  data.winner
                    ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20"
                    : "",
                )}
              >
                <div className="flex items-center justify-between gap-2 pb-4">
                  <div className="flex min-h-5 items-center gap-2">
                    <Users className="text-muted-foreground h-5 w-5" />
                    <h3 className="font-semibold"> {`Team: ${data.name}`}</h3>
                    <Separator orientation="vertical" />

                    {teamRoles.length > 0 && (
                      <>
                        <span className="text-sm font-medium">Roles:</span>
                        <ScrollArea>
                          <div className="flex max-w-[50vw] items-center gap-2">
                            {teamRoles.map((role) => (
                              <Badge
                                key={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
                                variant="secondary"
                                className="text-foreground text-sm font-medium"
                              >
                                {role.name}
                              </Badge>
                            ))}
                          </div>
                        </ScrollArea>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {scoresheet.winCondition === "Manual" ? (
                      data.winner ? (
                        "✔️"
                      ) : (
                        "❌"
                      )
                    ) : (
                      <>
                        <div className="text-sm font-medium">
                          {data.score} pts
                        </div>
                        {data.placement === 1 && (
                          <Trophy className="ml-auto h-5 w-5 text-yellow-500" />
                        )}
                        {data.placement === 2 && (
                          <Medal className="ml-auto h-5 w-5 text-gray-400" />
                        )}
                        {data.placement === 3 && (
                          <Award className="ml-auto h-5 w-5 text-amber-700" />
                        )}
                        {data.placement && data.placement > 3 && (
                          <div className="flex h-6 w-6 items-center justify-center p-1 font-semibold">
                            {data.placement}
                            {getOrdinalSuffix(data.placement)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <ul className="flex max-h-28 flex-col flex-wrap gap-2 overflow-y-auto pl-2">
                  {data.players.map((player) => {
                    return (
                      <li
                        key={player.baseMatchPlayerId}
                        className="flex items-center"
                      >
                        <PlayerImage
                          className="mr-3 h-8 w-8"
                          image={player.image}
                          alt={player.name}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">
                              {player.name}
                            </p>

                            {player.performance && (
                              <Badge
                                variant="outline"
                                className="text-foreground text-sm font-medium"
                              >
                                {player.performance}
                              </Badge>
                            )}
                            <div className="flex max-w-60 gap-2 overflow-x-auto">
                              {player.roles
                                .filter((role) => {
                                  const foundRole = teamRoles.find((r) =>
                                    isSameRole(r, role),
                                  );
                                  return !foundRole;
                                })
                                .map((role) => (
                                  <Badge
                                    key={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
                                    variant="outline"
                                    className="text-foreground text-sm font-medium text-nowrap"
                                  >
                                    {role.name}
                                  </Badge>
                                ))}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          } else {
            return (
              <div
                key={data.baseMatchPlayerId}
                className={cn(
                  "flex items-center rounded-lg border p-3",
                  data.winner
                    ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20"
                    : "",
                )}
              >
                <PlayerImage
                  className="mr-4 h-8 w-8"
                  image={data.image}
                  alt={data.name}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{data.name}</p>

                    {data.performance && (
                      <Badge
                        variant="outline"
                        className="text-foreground text-sm font-medium"
                      >
                        {data.performance}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {data.score !== null && (
                    <div className="text-sm font-medium">{data.score} pts</div>
                  )}
                  {scoresheet.winCondition === "Manual" ? (
                    data.winner ? (
                      "✔️"
                    ) : (
                      "❌"
                    )
                  ) : (
                    <>
                      {data.placement === 1 && (
                        <Trophy className="h-5 w-5 text-yellow-500" />
                      )}
                      {data.placement === 2 && (
                        <Medal className="h-5 w-5 text-gray-400" />
                      )}
                      {data.placement === 3 && (
                        <Award className="h-5 w-5 text-amber-700" />
                      )}
                      {data.placement && data.placement > 3 && (
                        <div className="flex h-6 w-6 items-center justify-center p-1 font-semibold">
                          {data.placement}
                          {getOrdinalSuffix(data.placement)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          }
        })}
      </CardContent>
    </Card>
  );
}

export function ShareMatchResultsSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Match Results</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-2 pt-0 sm:p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={cn("flex items-center rounded-lg border p-3")}
          >
            <Skeleton className="mr-4 h-8 w-8" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-4 w-32" />

                <Badge
                  variant="outline"
                  className="bg-accent text-foreground w-4 animate-pulse rounded-md text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex items-center gap-3" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
