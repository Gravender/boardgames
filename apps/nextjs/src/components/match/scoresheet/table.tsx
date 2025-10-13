"use client";

import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SquarePen } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { calculateFinalScore } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
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
import { useUpdateMatchRoundScoreMutation } from "~/components/match/hooks/scoresheet";
import {
  useMatch,
  usePlayersAndTeams,
  useScoresheet,
} from "~/components/match/hooks/suspenseQueries";
import { AddRoundDialog } from "~/components/match/scoresheet/add-round-dialog";
import { DetailDialog } from "~/components/match/scoresheet/DetailDialog";
import PlayerEditorDialog from "~/components/match/scoresheet/edit-player-dialog";
import TeamEditorDialog from "~/components/match/scoresheet/edit-team-dialog";
import { NumberInput } from "~/components/number-input";
import { useTRPC } from "~/trpc/react";

type Player = NonNullable<
  RouterOutputs["newMatch"]["getMatchPlayersAndTeams"]
>["players"][number];
type Team = NonNullable<
  RouterOutputs["newMatch"]["getMatchPlayersAndTeams"]
>["teams"][number];
export function ScoreSheetTable({
  id,
  type,
}: {
  id: number;
  type: "original" | "shared";
}) {
  const { match } = useMatch(id, type);
  const { scoresheet } = useScoresheet(id, type);
  const [team, setTeam] = useState<Team | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  return (
    <>
      <Table containerClassname="max-h-[65vh] h-fit w-screen sm:w-auto rounded-lg">
        <TableHeader className="bg-sidebar sticky top-0 z-20 text-card-foreground shadow-lg">
          <HeaderRow match={match} setTeam={setTeam} setPlayer={setPlayer} />
        </TableHeader>
        <TableBody>
          {scoresheet.rounds.map((round) => (
            <BodyRow key={`round-${round.id}`} match={match} round={round} />
          ))}
        </TableBody>
        <TableFooter>
          <CommentsRow match={match} />
          <TotalRow match={match} />
        </TableFooter>
      </Table>
      <TeamEditorDialog
        team={team}
        type={match.type}
        matchId={match.id}
        onClose={() => setTeam(null)}
      />
      <PlayerEditorDialog
        player={player}
        type={match.type}
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
  match: {
    id: number;
    type: "original" | "shared";
  };
  setTeam: Dispatch<SetStateAction<Team | null>>;
  setPlayer: Dispatch<SetStateAction<Player | null>>;
}) => {
  const { players, teams } = usePlayersAndTeams(match.id, match.type);
  const mappedTeams = useMemo(() => {
    const mappedTeams = teams
      .map((team) => {
        const teamPlayers = players.filter(
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
  }, [teams, players]);
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
        {players
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
      {players.map((player) => (
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
  match: {
    id: number;
    type: "original" | "shared";
  };
  round: RouterOutputs["newMatch"]["getMatchScoresheet"]["rounds"][number];
}) => {
  const { players, teams } = usePlayersAndTeams(match.id, match.type);

  const { updateMatchRoundScoreMutation } = useUpdateMatchRoundScoreMutation(
    match.id,
    match.type,
  );
  const updateTeamScore = (
    teamId: number,
    roundId: number,
    value: number | null,
  ) => {
    updateMatchRoundScoreMutation.mutate({
      match: {
        id: match.id,
        type: match.type,
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
    updateMatchRoundScoreMutation.mutate({
      match: {
        id: match.id,
        type: match.type,
      },
      type: "player",
      matchPlayerId: playerId,
      round: {
        id: roundId,
        score: value,
      },
    });
  };
  if (teams.length > 0) {
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
        {teams
          .filter((team) => players.find((player) => player.teamId === team.id))
          .map((team) => {
            const teamPlayer = players.filter(
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
        {players
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
      {players.map((player) => {
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

const CommentsRow = ({
  match,
}: {
  match: {
    id: number;
    type: "original" | "shared";
  };
}) => {
  const { players, teams } = usePlayersAndTeams(match.id, match.type);
  if (teams.length > 0) {
    return (
      <TableRow>
        <TableHead
          scope="row"
          className="sticky left-0 z-10 bg-muted font-semibold text-muted-foreground after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border sm:text-lg"
        >
          {"Details"}
        </TableHead>
        {teams
          .filter((team) => players.find((player) => player.teamId === team.id))
          .map((team) => (
            <TableCell
              key={`${team.id}-details`}
              className="border-b border-r p-2"
            >
              <DetailDialog
                match={{ id: match.id, type: match.type }}
                data={{
                  id: team.id,
                  name: team.name,
                  details: team.details,
                  type: "team",
                }}
              />
            </TableCell>
          ))}
        {players
          .filter((player) => player.teamId === null)
          .map((player) => {
            return (
              <TableCell
                key={`${player.id}-details`}
                className="border-b border-r p-2"
              >
                <DetailDialog
                  match={{ id: match.id, type: match.type }}
                  data={{
                    id: player.id,
                    name: player.name,
                    details: player.details,
                    type: "player",
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

      {players.map((player) => {
        return (
          <TableCell
            key={`${player.id}-details`}
            className="border-b border-r p-2"
          >
            <DetailDialog
              match={{ id: match.id, type: match.type }}
              data={{
                id: player.id,
                name: player.name,
                details: player.details,
                type: "player",
              }}
            />
          </TableCell>
        );
      })}
    </TableRow>
  );
};

const TotalRow = ({
  match,
}: {
  match: {
    id: number;
    type: "original" | "shared";
  };
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { players, teams } = usePlayersAndTeams(match.id, match.type);
  const { scoresheet } = useScoresheet(match.id, match.type);
  const updateMatchPlayerScore = useMutation(
    trpc.newMatch.update.updateMatchPlayerScore.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.newMatch.getMatch.queryOptions({
            id: match.id,
            type: match.type,
          }),
        );
      },
    }),
  );
  const updateTeamScore = (teamId: number, value: number | null) => {
    updateMatchPlayerScore.mutate({
      type: "team",
      match: {
        id: match.id,
        type: match.type,
      },
      teamId: teamId,
      score: value,
    });
  };
  const updatePlayerScore = (playerId: number, value: number | null) => {
    updateMatchPlayerScore.mutate({
      type: "player",
      match: {
        id: match.id,
        type: match.type,
      },
      matchPlayerId: playerId,
      score: value,
    });
  };
  if (teams.length > 0) {
    return (
      <TableRow>
        <TableHead
          scope="row"
          className="sticky left-0 bg-muted font-semibold text-muted-foreground after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border sm:text-lg"
        >
          Total
        </TableHead>
        {teams
          .filter((team) => players.find((player) => player.teamId === team.id))
          .map((team) => {
            const teamPlayer = players.filter(
              (player) => player.teamId === team.id,
            );
            const firstTeamPlayer = teamPlayer[0];
            if (firstTeamPlayer === undefined) return null;
            if (scoresheet.roundsScore === "Manual") {
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
              scoresheet,
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
        {players
          .filter((player) => player.teamId === null)
          .map((player) => {
            if (scoresheet.roundsScore === "Manual") {
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
              scoresheet,
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
      {players.map((player) => {
        if (scoresheet.roundsScore === "Manual") {
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
          scoresheet,
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
