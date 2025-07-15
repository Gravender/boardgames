"use client";

import type { Dispatch, SetStateAction } from "react";
import type { z } from "zod/v4";
import { useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { differenceInSeconds } from "date-fns";
import { Pause, Play, RotateCcw, SquarePen } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import {
  calculateFinalScore,
  calculatePlacement,
  formatDuration,
} from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Card } from "@board-games/ui/card";
import { Checkbox } from "@board-games/ui/checkbox";
import { Label } from "@board-games/ui/label";
import { ScrollArea, ScrollBar } from "@board-games/ui/scroll-area";
import { Separator } from "@board-games/ui/separator";
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

import type { ManualWinnerPlayerSchema } from "~/components/match/scoresheet/ManualWinnerDialog";
import type { TieBreakerPlayerSchema } from "~/components/match/scoresheet/TieBreakerDialog";
import { AddRoundDialog } from "~/components/match/scoresheet/add-round-dialog";
import { CommentDialog } from "~/components/match/scoresheet/CommentDialog";
import { DetailDialog } from "~/components/match/scoresheet/DetailDialog";
import PlayerEditorDialog from "~/components/match/scoresheet/edit-player-dialog";
import TeamEditorDialog from "~/components/match/scoresheet/edit-team-dialog";
import { ManualWinnerDialog } from "~/components/match/scoresheet/ManualWinnerDialog";
import { MatchImages } from "~/components/match/scoresheet/match-images";
import { TieBreakerDialog } from "~/components/match/scoresheet/TieBreakerDialog";
import { NumberInput } from "~/components/number-input";
import { Spinner } from "~/components/spinner";
import { useTRPC } from "~/trpc/react";

type Match = NonNullable<RouterOutputs["match"]["getMatch"]>;
type Player = Match["players"][number];
type Team = Match["teams"][number];
export function Scoresheet({ matchId }: { matchId: number }) {
  const trpc = useTRPC();
  const { data: match } = useSuspenseQuery(
    trpc.match.getMatch.queryOptions({ id: matchId }),
  );
  if (match === null) {
    return notFound();
  }
  return <ScoresheetContent match={match} />;
}
function ScoresheetContent({ match }: { match: Match }) {
  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-6xl sm:px-4">
        <ScoreSheetTable match={match} />
        <ScoresheetFooter match={match} />
      </div>
    </div>
  );
}
function ScoreSheetTable({ match }: { match: Match }) {
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
  if (match.teams.length > 0) {
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
        {match.teams
          .filter((team) =>
            match.players.find((player) => player.teamId === team.id),
          )
          .map((team) => {
            const teamPlayers = match.players.filter(
              (player) => player.teamId === team.id,
            );
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
                      {teamPlayers.map((player) => {
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
                      value={roundPlayers[0]?.score ?? ""}
                      onValueChange={(value) => {
                        updateTeamScore(team.id, round.id, value);
                      }}
                      className="border-none text-center"
                    />
                  ) : (
                    <>
                      <Label className="hidden">{`Checkbox to toggle score: ${round.score}`}</Label>
                      <Checkbox
                        onCheckedChange={(isChecked) => {
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
                      value={roundPlayer?.score ?? ""}
                      onValueChange={(value) => {
                        updatePlayerScore(player.id, round.id, value);
                      }}
                      className="border-none text-center"
                    />
                  ) : (
                    <>
                      <Label className="hidden">{`Checkbox to toggle score: ${round.score}`}</Label>
                      <Checkbox
                        onCheckedChange={(isChecked) => {
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
                  value={roundPlayer?.score ?? ""}
                  onValueChange={(value) => {
                    updatePlayerScore(player.id, round.id, value);
                  }}
                  className="border-none text-center"
                />
              ) : (
                <>
                  <Label className="hidden">{`Checkbox to toggle score: ${round.score}`}</Label>
                  <Checkbox
                    onCheckedChange={(isChecked) => {
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
          {"Details(optional)"}
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
                    value={firstTeamPlayer.score ?? ""}
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
                    <span className="text-center">
                      {total === Infinity ? 0 : total === -Infinity ? 0 : total}
                    </span>
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
                    value={player.score ?? ""}
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
                    <span className="text-center">
                      {total === Infinity ? 0 : total === -Infinity ? 0 : total}
                    </span>
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
                value={player.score ?? ""}
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
                <span className="text-center">
                  {total === Infinity ? 0 : total === -Infinity ? 0 : total}
                </span>
              )}
            </div>
          </TableCell>
        );
      })}
    </TableRow>
  );
};
function ScoresheetFooter({ match }: { match: Match }) {
  const [duration, setDuration] = useState(match.duration);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualWinners, setManualWinners] = useState<
    z.infer<typeof ManualWinnerPlayerSchema>
  >([]);
  const [openManualWinnerDialog, setOpenManualWinnerDialog] = useState(false);
  const [tieBreakers, setTieBreakers] = useState<
    z.infer<typeof TieBreakerPlayerSchema>
  >([]);
  const [openTieBreakerDialog, setOpenTieBreakerDialog] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (match.running) {
      interval = setInterval(() => {
        if (!match.startTime) {
          setDuration((prevDuration) => prevDuration + 1);
        } else {
          const now = new Date();
          const startTime = match.startTime;
          const elapsedTime = differenceInSeconds(now, startTime);
          const totalDuration = match.duration + elapsedTime;
          setDuration(totalDuration);
        }
      }, 1000);
    } else {
      setDuration(match.duration);
    }
    return () => clearInterval(interval);
  }, [match]);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  const invalidateMatch = async () =>
    queryClient.invalidateQueries(
      trpc.match.getMatch.queryOptions({ id: match.id }),
    );
  const startMatchDuration = useMutation(
    trpc.match.matchStart.mutationOptions({
      onSuccess: invalidateMatch,
    }),
  );
  const pauseMatchDuration = useMutation(
    trpc.match.matchPause.mutationOptions({
      onSuccess: invalidateMatch,
    }),
  );
  const resetMatchDuration = useMutation(
    trpc.match.matchResetDuration.mutationOptions({
      onSuccess: invalidateMatch,
    }),
  );
  const updateMatch = useMutation(
    trpc.match.updateMatch.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.match.getMatch.queryOptions({ id: match.id }),
        );
        await queryClient.invalidateQueries(
          trpc.game.getGame.queryOptions({ id: match.gameId }),
        );

        router.push(`/dashboard/games/${match.gameId}/${match.id}/summary`);
        setIsSubmitting(false);
      },
    }),
  );

  const toggleClock = () => {
    if (match.running) {
      pauseMatchDuration.mutate({
        id: match.id,
      });
    } else {
      startMatchDuration.mutate({
        id: match.id,
      });
    }
  };

  const resetClock = () => {
    resetMatchDuration.mutate({
      id: match.id,
    });
    setDuration(0);
  };

  const onFinish = () => {
    if (match.running) {
      pauseMatchDuration.mutate({
        id: match.id,
      });
    }
    setIsSubmitting(true);
    const submittedPlayers = match.players.flatMap((player) =>
      player.rounds.map((playerRound) => ({
        id: playerRound.id,
        score: playerRound.score,
      })),
    );
    if (match.scoresheet.winCondition === "Manual") {
      setManualWinners(
        match.players.map((player) => {
          return {
            id: player.id,
            name: player.name,
            image: player.image,
            score: calculateFinalScore(
              player.rounds.map((round) => ({
                score: round.score,
              })),
              match.scoresheet,
            ),
            teamId: player.teamId,
          };
        }),
      );
      setOpenManualWinnerDialog(true);
      return;
    }

    const playersPlacement = calculatePlacement(
      match.players.map((player) => ({
        id: player.id,
        rounds: player.rounds.map((round) => ({
          score: round.score,
        })),
        teamId: player.teamId,
      })),

      match.scoresheet,
    );
    let isTieBreaker = false;
    const placements: Record<number, number> = {};
    const nonTeamPlayerPlacements = playersPlacement
      .filter((player) => {
        const foundPlayer = match.players.find((p) => p.id === player.id);
        return foundPlayer?.teamId === null;
      })
      .map((player) => player.placement);
    const teamPlacements = Array.from(
      new Set(
        playersPlacement
          .filter((player) => {
            const foundPlayer = match.players.find((p) => p.id === player.id);
            return foundPlayer?.teamId !== null;
          })
          .map((player) => {
            {
              const foundPlayer = match.players.find((p) => p.id === player.id);
              return foundPlayer?.teamId ?? null;
            }
          }),
      ),
    ).map((teamId) => {
      const findFirstPlayer = match.players.find(
        (player) => player.teamId === teamId,
      );
      const findPlayerPlacement = playersPlacement.find(
        (player) => player.id === findFirstPlayer?.id,
      );
      return findPlayerPlacement?.placement ?? -1;
    });
    const teamAndPlayerPlacements = [
      ...teamPlacements,
      ...nonTeamPlayerPlacements,
    ];
    for (const currentPlacement of teamAndPlayerPlacements) {
      placements[currentPlacement] = (placements[currentPlacement] ?? 0) + 1;
      if (placements[currentPlacement] > 1) {
        isTieBreaker = true;
        break;
      }
    }
    if (isTieBreaker) {
      setOpenTieBreakerDialog(true);
      setTieBreakers(
        playersPlacement.map((player) => {
          const foundPlayer = match.players.find((p) => p.id === player.id);
          return {
            matchPlayerId: player.id,
            name: foundPlayer?.name ?? "",
            image: foundPlayer?.image ?? null,
            placement: player.placement,
            score: player.score,
            teamId: foundPlayer?.teamId ?? null,
          };
        }),
      );
    } else {
      updateMatch.mutate({
        match: {
          id: match.id,
          duration: duration,
          finished: true,
          running: false,
        },
        roundPlayers: submittedPlayers,
        playersPlacement: playersPlacement,
      });
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2 p-6 pb-0">
        <div className="flex w-full justify-between px-2 pt-6">
          <div className="flex items-center justify-center gap-2">
            <div className="text-center text-2xl font-bold">
              {formatDuration(duration, true)}
            </div>
            <Button onClick={toggleClock} size={"icon"} variant={"outline"}>
              {match.running ? <Pause /> : <Play />}
            </Button>
            <Button onClick={resetClock} size={"icon"} variant={"outline"}>
              <RotateCcw />
            </Button>
          </div>
          <Button
            onClick={() => {
              onFinish();
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner />
                <span>Submitting...</span>
              </>
            ) : (
              "Finish"
            )}
          </Button>
        </div>
        <Separator />
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-full items-start">
            <CommentDialog matchId={match.id} comment={match.comment} />
          </div>
          <MatchImages matchId={match.id} duration={duration} />
        </div>
      </div>
      <ManualWinnerDialog
        isOpen={openManualWinnerDialog}
        setIsOpen={setOpenManualWinnerDialog}
        gameId={match.gameId}
        matchId={match.id}
        players={manualWinners}
        teams={match.teams}
        scoresheet={match.scoresheet}
      />
      <TieBreakerDialog
        isOpen={openTieBreakerDialog}
        setIsOpen={setOpenTieBreakerDialog}
        gameId={match.gameId}
        matchId={match.id}
        players={tieBreakers}
        teams={match.teams}
      />
    </>
  );
}
