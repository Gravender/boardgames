"use client";

import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SquarePen } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { calculateFinalScore } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Card } from "@board-games/ui/card";
import { Label } from "@board-games/ui/label";
import { ScrollArea, ScrollBar } from "@board-games/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@board-games/ui/table";
import { cn } from "@board-games/ui/utils";

import { DebouncedCheckbox } from "~/components/debounced-checkbox";
import { AddRoundDialog } from "~/components/match/scoresheet/add-round-dialog";
import { DetailDialog } from "~/components/match/scoresheet/DetailDialog";
import PlayerEditorDialog from "~/components/match/scoresheet/edit-player-dialog";
import TeamEditorDialog from "~/components/match/scoresheet/edit-team-dialog";
import { NumberInput } from "~/components/number-input";
import { useTRPC } from "~/trpc/react";

type Match = NonNullable<RouterOutputs["match"]["getMatch"]>;
type Player = Match["players"][number];
type Team = Match["teams"][number];
export function ScoreSheetTable({ match }: { match: Match }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  return (
    <>
      <Card className="pb-0">
        <Table containerClassname="max-h-[65vh] h-fit w-screen sm:w-auto rounded-lg">
          <TableHeader className="bg-sidebar sticky top-0 z-20 text-card-foreground shadow-lg">
            <HeaderRow match={match} setTeam={setTeam} setPlayer={setPlayer} />
          </TableHeader>
          <TableBody>
            {match.scoresheet.rounds.map((round) => (
              <BodyRow key={`round-${round.id}`} match={match} round={round} />
            ))}
          </TableBody>
          <TableFooter>
            <CommentsRow match={match} />
            <TotalRow match={match} />
          </TableFooter>
        </Table>
      </Card>
      <TeamEditorDialog
        team={team}
        players={match.players}
        gameId={match.gameId}
        onClose={() => setTeam(null)}
      />
      <PlayerEditorDialog
        teams={match.teams}
        player={player}
        players={match.players}
        gameId={match.gameId}
        matchId={match.id}
        onClose={() => setPlayer(null)}
      />
    </>
  );
}

const HeaderRow = ({
  match,
  setTeam,
  setPlayer,
}: {
  match: Match;
  setTeam: Dispatch<SetStateAction<Team | null>>;
  setPlayer: Dispatch<SetStateAction<Player | null>>;
}) => {
  const mappedTeams = useMemo(() => {
    const mappedTeams = match.teams
      .map((team) => {
        const teamPlayers = match.players.filter(
          (player) => player.teamId === team.id,
        );
        if (teamPlayers.length === 0) return null;
        return {
          ...team,
          players: teamPlayers,
        };
      })
      .filter((team) => team !== null);
    return mappedTeams;
  }, [match]);
  if (mappedTeams.length > 0) {
    return (
      <TableRow>
        <TableHead
          scope="col"
          className="bg-sidebar sticky left-0 top-0 z-10 w-20 sm:w-36"
        >
          <div>
            <AddRoundDialog match={match} />
          </div>
        </TableHead>
        {mappedTeams.map((team) => {
          return (
            <TableHead
              className="min-w-20 text-center"
              scope="col"
              key={team.id}
            >
              <div className="flex flex-col items-center justify-center gap-1 py-1">
                <Button
                  variant="ghost"
                  type="button"
                  size="sm"
                  className="font-semibold"
                  onClick={() => setTeam(team)}
                >
                  {`Team: ${team.name}`}
                  <SquarePen className="h-4 w-4" />
                </Button>
                <ScrollArea>
                  <div className="flex max-h-10 w-full flex-row flex-wrap justify-center gap-1">
                    {team.players.map((player) => {
                      return (
                        <button
                          key={player.id}
                          onClick={() => setPlayer(player)}
                        >
                          <Badge>{player.name}</Badge>
                        </button>
                      );
                    })}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            </TableHead>
          );
        })}
        {match.players
          .filter((player) => player.teamId === null)
          .map((player) => (
            <TableHead
              className="min-w-20 text-center"
              scope="col"
              key={player.id}
            >
              <Button
                variant="ghost"
                type="button"
                size="sm"
                className="font-semibold"
                onClick={() => setPlayer(player)}
              >
                {player.name}
                <SquarePen className="h-4 w-4" />
              </Button>
            </TableHead>
          ))}
      </TableRow>
    );
  }
  return (
    <TableRow>
      <TableHead
        scope="col"
        className="bg-sidebar sticky left-0 top-0 w-20 sm:w-36"
      >
        <div>
          <AddRoundDialog match={match} />
        </div>
      </TableHead>
      {match.players.map((player) => (
        <TableHead className="min-w-20 text-center" scope="col" key={player.id}>
          <Button
            variant="ghost"
            type="button"
            size="sm"
            className="font-semibold"
            onClick={() => setPlayer(player)}
          >
            {player.name}
            <SquarePen className="h-4 w-4" />
          </Button>
        </TableHead>
      ))}
    </TableRow>
  );
};
const BodyRow = ({
  match,
  round,
}: {
  match: Match;
  round: Match["scoresheet"]["rounds"][number];
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const updateRoundScore = useMutation(
    trpc.match.updateMatchRoundScore.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.match.getMatch.queryOptions({ id: match.id }),
        );
      },
    }),
  );
  const updateTeamScore = (
    teamId: number,
    roundId: number,
    value: number | null,
  ) => {
    updateRoundScore.mutate({
      match: {
        id: match.id,
      },
      type: "team",
      teamId: teamId,
      round: {
        id: roundId,
        score: value,
      },
    });
  };
  const updatePlayerScore = (
    playerId: number,
    roundId: number,
    value: number | null,
  ) => {
    updateRoundScore.mutate({
      match: {
        id: match.id,
      },
      type: "player",
      matchPlayerId: playerId,
      round: {
        id: roundId,
        score: value,
      },
    });
  };
  if (match.teams.length > 0) {
    return (
      <TableRow>
        <TableHead
          scope="row"
          className={cn(
            "sticky left-0 z-10 max-w-[95vw] bg-card font-semibold text-muted-foreground after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border sm:max-w-[90vw] sm:text-lg",
            round.color && "over:opacity-50 hover:dark:opacity-80",
          )}
          style={{
            backgroundColor: round.color ?? "",
          }}
        >
          <span
            style={{
              mixBlendMode: round.color ? "multiply" : "normal",
            }}
          >
            {round.name}
          </span>
        </TableHead>
        {match.teams
          .filter((team) =>
            match.players.find((player) => player.teamId === team.id),
          )
          .map((team) => {
            const teamPlayer = match.players.filter(
              (player) => player.teamId === team.id,
            );
            const roundPlayers = teamPlayer
              .flatMap((player) => {
                return player.rounds.find(
                  (roundPlayer) => roundPlayer.roundId === round.id,
                );
              })
              .filter((roundPlayer) => roundPlayer !== undefined);
            return (
              <TableCell
                key={`team-${team.id}-round-${round.id}`}
                className="p-0"
              >
                <div className="flex h-full min-h-[40px] w-full items-center justify-center p-1">
                  {round.type === "Numeric" ? (
                    <NumberInput
                      defaultValue={roundPlayers[0]?.score ?? ""}
                      onValueChange={(value) => {
                        updateTeamScore(team.id, round.id, value);
                      }}
                      className="border-none text-center"
                    />
                  ) : (
                    <>
                      <Label className="hidden">{`Checkbox to toggle score: ${round.score}`}</Label>
                      <DebouncedCheckbox
                        onDebouncedChange={(isChecked) => {
                          updateTeamScore(
                            team.id,
                            round.id,
                            isChecked ? round.score : null,
                          );
                        }}
                        checked={roundPlayers[0]?.score === round.score}
                      />
                    </>
                  )}
                </div>
              </TableCell>
            );
          })}
        {match.players
          .filter((player) => player.teamId === null)
          .map((player) => {
            const roundPlayer = player.rounds.find(
              (roundPlayer) => roundPlayer.roundId === round.id,
            );
            return (
              <TableCell
                key={`player-${player.id}-round-${round.id}`}
                className="p-0"
              >
                <div className="flex h-full min-h-[40px] w-full items-center justify-center p-1">
                  {round.type === "Numeric" ? (
                    <NumberInput
                      defaultValue={roundPlayer?.score ?? ""}
                      onValueChange={(value) => {
                        updatePlayerScore(player.id, round.id, value);
                      }}
                      className="border-none text-center"
                    />
                  ) : (
                    <>
                      <Label className="hidden">{`Checkbox to toggle score: ${round.score}`}</Label>
                      <DebouncedCheckbox
                        onDebouncedChange={(isChecked) => {
                          updatePlayerScore(
                            player.id,
                            round.id,
                            isChecked ? round.score : null,
                          );
                        }}
                        checked={roundPlayer?.score === round.score}
                      />
                    </>
                  )}
                </div>
              </TableCell>
            );
          })}
      </TableRow>
    );
  }
  return (
    <TableRow>
      <TableHead
        scope="row"
        className={cn(
          "sticky left-0 z-10 bg-card font-semibold text-muted-foreground after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border sm:text-lg",
          round.color && "hover:opacity-50 hover:dark:opacity-80",
        )}
        style={{
          backgroundColor: round.color ?? "",
        }}
      >
        <span
          style={{
            mixBlendMode: round.color ? "multiply" : "normal",
          }}
        >
          {round.name}
        </span>
      </TableHead>
      {match.players.map((player) => {
        const roundPlayer = player.rounds.find(
          (roundPlayer) => roundPlayer.roundId === round.id,
        );
        return (
          <TableCell
            key={`player-${player.id}-round-${round.id}`}
            className="p-0"
          >
            <div className="flex h-full min-h-[40px] w-full items-center justify-center p-1">
              {round.type === "Numeric" ? (
                <NumberInput
                  defaultValue={roundPlayer?.score ?? ""}
                  onValueChange={(value) => {
                    updatePlayerScore(player.id, round.id, value);
                  }}
                  className="border-none text-center"
                />
              ) : (
                <>
                  <Label className="hidden">{`Checkbox to toggle score: ${round.score}`}</Label>
                  <DebouncedCheckbox
                    onDebouncedChange={(isChecked) => {
                      updatePlayerScore(
                        player.id,
                        round.id,
                        isChecked ? round.score : null,
                      );
                    }}
                    checked={roundPlayer?.score === round.score}
                  />
                </>
              )}
            </div>
          </TableCell>
        );
      })}
    </TableRow>
  );
};

const CommentsRow = ({ match }: { match: Match }) => {
  if (match.teams.length > 0) {
    return (
      <TableRow>
        <TableHead
          scope="row"
          className="sticky left-0 z-10 bg-muted font-semibold text-muted-foreground after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border sm:text-lg"
        >
          {"Details"}
        </TableHead>
        {match.teams
          .filter((team) =>
            match.players.find((player) => player.teamId === team.id),
          )
          .map((team) => (
            <TableCell
              key={`${team.id}-details`}
              className="border-b border-r p-2"
            >
              <DetailDialog
                matchId={match.id}
                data={{
                  id: team.id,
                  name: team.name,
                  details: team.details,
                  type: "Team",
                }}
              />
            </TableCell>
          ))}
        {match.players
          .filter((player) => player.teamId === null)
          .map((player) => {
            return (
              <TableCell
                key={`${player.id}-details`}
                className="border-b border-r p-2"
              >
                <DetailDialog
                  matchId={match.id}
                  data={{
                    id: player.id,
                    name: player.name,
                    details: player.details,
                    type: "Player",
                  }}
                />
              </TableCell>
            );
          })}
      </TableRow>
    );
  }
  return (
    <TableRow>
      <TableHead
        scope="row"
        className="sticky left-0 z-10 bg-muted font-semibold text-muted-foreground after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border sm:text-lg"
      >
        {"Details(optional)"}
      </TableHead>

      {match.players.map((player) => {
        return (
          <TableCell
            key={`${player.id}-details`}
            className="border-b border-r p-2"
          >
            <DetailDialog
              matchId={match.id}
              data={{
                id: player.id,
                name: player.name,
                details: player.details,
                type: "Player",
              }}
            />
          </TableCell>
        );
      })}
    </TableRow>
  );
};

const TotalRow = ({ match }: { match: Match }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateMatchPlayerScore = useMutation(
    trpc.match.updateMatchPlayerScore.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.match.getMatch.queryOptions({ id: match.id }),
        );
      },
    }),
  );
  const updateTeamScore = (teamId: number, value: number | null) => {
    updateMatchPlayerScore.mutate({
      match: {
        id: match.id,
      },
      type: "team",
      teamId: teamId,
      score: value,
    });
  };
  const updatePlayerScore = (playerId: number, value: number | null) => {
    updateMatchPlayerScore.mutate({
      match: {
        id: match.id,
      },
      type: "player",
      matchPlayerId: playerId,
      score: value,
    });
  };
  if (match.teams.length > 0) {
    return (
      <TableRow>
        <TableHead
          scope="row"
          className="sticky left-0 bg-muted font-semibold text-muted-foreground after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border sm:text-lg"
        >
          Total
        </TableHead>
        {match.teams
          .filter((team) =>
            match.players.find((player) => player.teamId === team.id),
          )
          .map((team) => {
            const teamPlayer = match.players.filter(
              (player) => player.teamId === team.id,
            );
            const firstTeamPlayer = teamPlayer[0];
            if (firstTeamPlayer === undefined) return null;
            if (match.scoresheet.roundsScore === "Manual") {
              return (
                <TableCell key={`${team.id}-total`}>
                  <NumberInput
                    className="text-center"
                    defaultValue={firstTeamPlayer.score ?? ""}
                    onValueChange={(value) => {
                      updateTeamScore(team.id, value);
                    }}
                  />
                </TableCell>
              );
            }

            const total = calculateFinalScore(
              firstTeamPlayer.rounds.map((round) => ({
                score: round.score,
              })),
              match.scoresheet,
            );
            return (
              <TableCell key={`${team.id}-total`}>
                <div className="flex items-center justify-center">
                  {total !== null && (
                    <span className="text-center">{total}</span>
                  )}
                </div>
              </TableCell>
            );
          })}
        {match.players
          .filter((player) => player.teamId === null)
          .map((player) => {
            if (match.scoresheet.roundsScore === "Manual") {
              return (
                <TableCell key={`${player.id}-total`}>
                  <NumberInput
                    className="text-center"
                    defaultValue={player.score ?? ""}
                    onValueChange={(value) => {
                      updatePlayerScore(player.id, value);
                    }}
                  />
                </TableCell>
              );
            }
            const total = calculateFinalScore(
              player.rounds.map((round) => ({
                score: round.score,
              })),
              match.scoresheet,
            );
            return (
              <TableCell key={`${player.id}-total`}>
                <div className="flex items-center justify-center">
                  {total !== null && (
                    <span className="text-center">{total}</span>
                  )}
                </div>
              </TableCell>
            );
          })}
      </TableRow>
    );
  }
  return (
    <TableRow>
      <TableHead
        scope="row"
        className="sticky left-0 bg-muted font-semibold text-muted-foreground after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border sm:text-lg"
      >
        Total
      </TableHead>
      {match.players.map((player) => {
        if (match.scoresheet.roundsScore === "Manual") {
          return (
            <TableCell key={`${player.id}-total`}>
              <NumberInput
                className="text-center"
                defaultValue={player.score ?? ""}
                onValueChange={(value) => {
                  updatePlayerScore(player.id, value);
                }}
              />
            </TableCell>
          );
        }
        const total = calculateFinalScore(
          player.rounds.map((round) => ({
            score: round.score,
          })),
          match.scoresheet,
        );
        return (
          <TableCell key={`${player.id}-total`}>
            <div className="flex items-center justify-center">
              {total !== null && <span className="text-center">{total}</span>}
            </div>
          </TableCell>
        );
      })}
    </TableRow>
  );
};
