"use client";

import { Award, Medal, Trophy, Users } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { getOrdinalSuffix } from "@board-games/shared";
import { cn } from "@board-games/ui/utils";

import { PlayerImage } from "~/components/player-image";

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type Match = GameStats["matches"][number];

export function PlacementIndicator({
  placement,
  isManual,
  isWinner,
}: {
  placement: number | null | undefined;
  isManual: boolean;
  isWinner: boolean | null;
}) {
  if (isManual) {
    return isWinner ? "✔️" : "❌";
  }

  if (!placement) return null;

  switch (placement) {
    case 1:
      return <Trophy className="ml-auto h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="ml-auto h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="ml-auto h-5 w-5 text-amber-700" />;
    default:
      return (
        <div className="flex h-6 w-6 items-center justify-center p-1 font-semibold">
          {placement}
          {getOrdinalSuffix(placement)}
        </div>
      );
  }
}

export function PlayerGroupDisplay({
  players,
  scoresheet,
}: {
  players: Match["players"];
  scoresheet: Match["scoresheet"];
}) {
  const teams = players
    .filter((p) => p.team !== null)
    .map((p) => p.team)
    .filter(
      (team, index, self) =>
        self.findIndex((t) => t?.id === team?.id) === index,
    );

  const noTeamPlayers = players.filter((p) => p.team === null);

  return (
    <>
      {teams.length > 0 && (
        <TeamGroups teams={teams} players={players} scoresheet={scoresheet} />
      )}
      {noTeamPlayers.length > 0 && (
        <NoTeamPlayers
          players={noTeamPlayers}
          scoresheet={scoresheet}
          hasTeams={teams.length > 0}
        />
      )}
    </>
  );
}

function TeamGroups({
  teams,
  players,
  scoresheet,
}: {
  teams: Match["players"][number]["team"][];
  players: Match["players"];
  scoresheet: Match["scoresheet"];
}) {
  return (
    <div className="flex flex-col gap-2">
      {teams.map((team) => {
        const teamPlayers = players.filter(
          (player) => player.team?.id === team?.id,
        );
        if (teamPlayers.length === 0) return null;
        return (
          <div
            key={team?.id}
            className={cn(
              "rounded-lg border p-4",
              teamPlayers[0]?.isWinner
                ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20"
                : "",
            )}
          >
            <div className="flex items-center justify-between gap-2 pb-4">
              <div className="flex items-center gap-2">
                <Users className="text-muted-foreground h-5 w-5" />
                <h3 className="font-semibold">{`Team: ${team?.name}`}</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium">
                  {teamPlayers[0]?.score} pts
                </div>
                <PlacementIndicator
                  placement={teamPlayers[0]?.placement}
                  isManual={scoresheet.winCondition === "Manual"}
                  isWinner={teamPlayers[0]?.isWinner ?? false}
                />
              </div>
            </div>
            <ul
              className="border-muted-foreground/20 grid grid-cols-1 gap-3 border-l-2 pl-2 sm:grid-cols-2"
              aria-label="Team players"
            >
              {teamPlayers.map((player) => (
                <li key={player.id} className="flex items-center">
                  <PlayerImage
                    className="mr-3 h-8 w-8"
                    image={player.image}
                    alt={player.name}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{player.name}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function NoTeamPlayers({
  players,
  scoresheet,
  hasTeams,
}: {
  players: Match["players"];
  scoresheet: Match["scoresheet"];
  hasTeams: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2",
        hasTeams ? "mt-4" : "",
      )}
    >
      {players.map((player) => (
        <div
          key={player.id}
          className={cn(
            "flex items-center gap-3 rounded-lg",
            player.isWinner ? "bg-yellow-50 dark:bg-yellow-950/20" : "",
          )}
        >
          <PlayerImage
            className="size-8"
            image={player.image}
            alt={player.name}
          />
          <div className="flex items-center gap-2">
            <p className="font-medium">{player.name}</p>
            <div className="flex items-center gap-2">
              {player.score !== null &&
                scoresheet.winCondition !== "Manual" && (
                  <span className="text-sm">Score: {player.score}</span>
                )}
              <PlacementIndicator
                placement={player.placement}
                isManual={scoresheet.winCondition === "Manual"}
                isWinner={player.isWinner ?? false}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
