import { Award, Medal, Trophy, Users } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { getOrdinalSuffix } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Separator } from "@board-games/ui/separator";
import { cn } from "@board-games/ui/utils";

import { PlayerImage } from "~/components/player-image";

type SharedMatchStats =
  | NonNullable<RouterOutputs["match"]["getSummary"]>
  | NonNullable<RouterOutputs["sharing"]["getSharedMatchSummary"]>;

type teamWithPlayers = SharedMatchStats["teams"][number] & {
  teamType: "Team";
  players: SharedMatchStats["players"];
  placement: number;
  score: number;
  winner: boolean;
};
type playerWithoutTeams = SharedMatchStats["players"][number] & {
  teamType: "Player";
};

export default function ShareMatchResults({
  match,
}: {
  match: SharedMatchStats;
}) {
  const calculatePerformance = (
    player: NonNullable<
      RouterOutputs["sharing"]["getSharedMatchSummary"]
    >["players"][number],
  ) => {
    if (player.score === null) return undefined;
    const foundPlayer = match.playerStats.find(
      (p) => p.playerId === player.playerId,
    );

    if (!foundPlayer) return undefined;

    if (foundPlayer.firstGame) return "First Game";
    const highestScore = Math.max(...foundPlayer.scores);
    const lowestScore = Math.min(...foundPlayer.scores);
    if (match.scoresheet.winCondition === "Highest Score") {
      if (player.score >= highestScore) return "Best Game";
      if (player.score === lowestScore) return "Worst Game";
    }
    if (match.scoresheet.winCondition === "Lowest Score") {
      if (player.score <= lowestScore) return "Best Game";
      if (player.score === highestScore) return "Worst Game";
    }
    if (match.scoresheet.winCondition === "Target Score") {
      if (player.score === match.scoresheet.targetScore) return "Perfect Game";
      return "Worst Game";
    }
    return undefined;
  };
  const matchResults = () => {
    const playersWithoutTeams = match.players
      .filter((player) => player.teamId === null)
      .map<playerWithoutTeams>((player) => ({ ...player, teamType: "Player" }));

    const teamsWithTeams = match.teams
      .map<teamWithPlayers>((team) => {
        const teamPlayers = match.players.filter(
          (player) => player.teamId === team.id,
        );
        const [firstTeamPlayer] = teamPlayers;
        return {
          ...team,
          players: teamPlayers,
          placement: firstTeamPlayer?.placement ?? 0,
          score: firstTeamPlayer?.score ?? 0,
          winner: firstTeamPlayer?.winner ?? false,
          teamType: "Team",
        };
      })
      .filter((team) => team.players.length > 0);
    const sortedPlayersAndTeams: (playerWithoutTeams | teamWithPlayers)[] = [
      ...teamsWithTeams,
      ...playersWithoutTeams,
    ].toSorted((a, b) => {
      if (a.placement === b.placement) {
        return a.name.localeCompare(b.name);
      } else {
        if (a.placement === null) return -1;
        if (b.placement === null) return 1;
        return a.placement - b.placement;
      }
    });
    return sortedPlayersAndTeams;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Match Results</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-2 pt-0 sm:p-6">
        {matchResults().map((data) => {
          if (data.teamType === "Team") {
            const roles = data.players.reduce<
              { id: number; name: string; description: string | null }[]
            >((acc, player) => {
              if (player.roles.length > 0) {
                player.roles.forEach((role) => {
                  const foundRole = acc.find((r) => r.id === role.id);
                  if (!foundRole) {
                    acc.push({
                      id: role.id,
                      name: role.name,
                      description: role.description,
                    });
                  }
                });
              }

              return acc;
            }, []);
            const teamRoles = roles.filter((role) => {
              return data.players.every((player) => {
                if ("roles" in player) {
                  const foundRole = player.roles.find((r) => r.id === role.id);
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
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold"> {`Team: ${data.name}`}</h3>
                    <Separator orientation="vertical" />

                    {teamRoles.length > 0 && (
                      <>
                        <span className="text-sm font-medium">Roles:</span>
                        <ScrollArea>
                          <div className="flex max-w-[50vw] items-center gap-2">
                            {teamRoles.map((role) => (
                              <Badge
                                key={role.id}
                                variant="secondary"
                                className="text-sm font-medium text-foreground"
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
                    <div className="text-sm font-medium">{data.score} pts</div>
                    {match.scoresheet.winCondition === "Manual" ? (
                      data.winner ? (
                        "✔️"
                      ) : (
                        "❌"
                      )
                    ) : (
                      <>
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
                      <li key={player.id} className="flex items-center">
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

                            {calculatePerformance(player) && (
                              <Badge
                                variant="outline"
                                className="text-sm font-medium text-foreground"
                              >
                                {calculatePerformance(player)}
                              </Badge>
                            )}
                            <div className="flex max-w-60 gap-2 overflow-x-auto">
                              {player.roles
                                .filter((role) => {
                                  const foundRole = teamRoles.find(
                                    (r) => r.id === role.id,
                                  );
                                  return !foundRole;
                                })
                                .map((role) => (
                                  <Badge
                                    key={role.id}
                                    variant="outline"
                                    className="text-nowrap text-sm font-medium text-foreground"
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
                key={data.id}
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

                    {calculatePerformance(data) && (
                      <Badge
                        variant="outline"
                        className="text-sm font-medium text-foreground"
                      >
                        {calculatePerformance(data)}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {data.score !== null && (
                    <div className="text-sm font-medium">{data.score} pts</div>
                  )}
                  {match.scoresheet.winCondition === "Manual" ? (
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
