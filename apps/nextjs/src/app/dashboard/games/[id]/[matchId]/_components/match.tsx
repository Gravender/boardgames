"use client";

import type { z } from "zod/v4";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { differenceInSeconds } from "date-fns";
import { ListPlus, Pause, Play, RotateCcw } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { roundTypes } from "@board-games/db/constants";
import { insertRoundSchema } from "@board-games/db/zodSchema";
import {
  calculateFinalScore,
  calculatePlacement,
  formatDuration,
} from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { Checkbox } from "@board-games/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "@board-games/ui/form";
import { Input } from "@board-games/ui/input";
import { Label } from "@board-games/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
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

import type { ManualWinnerPlayerSchema } from "./ManualWinnerDialog";
import type { TieBreakerPlayerSchema } from "./TieBreakerDialog";
import { GradientPicker } from "~/components/color-picker";
import { NumberInput } from "~/components/number-input";
import { Spinner } from "~/components/spinner";
import { useDebouncedUpdateMatchData } from "~/hooks/use-debounced-update-match";
import { useTRPC } from "~/trpc/react";
import { CommentDialog } from "./CommentDialog";
import { DetailDialog } from "./DetailDialog";
import { ManualWinnerDialog } from "./ManualWinnerDialog";
import { MatchImages } from "./match-images";
import { TieBreakerDialog } from "./TieBreakerDialog";

type Match = NonNullable<RouterOutputs["match"]["getMatch"]>;
type Player = Match["players"][number];
export function Match({ matchId }: { matchId: number }) {
  const trpc = useTRPC();
  const { data: match } = useSuspenseQuery(
    trpc.match.getMatch.queryOptions({ id: matchId }),
  );

  const [players, setPlayers] = useState<Player[]>([]);
  const [manualWinners, setManualWinners] = useState<
    z.infer<typeof ManualWinnerPlayerSchema>
  >([]);
  const [openManualWinnerDialog, setOpenManualWinnerDialog] = useState(false);
  const [tieBreakers, setTieBreakers] = useState<
    z.infer<typeof TieBreakerPlayerSchema>
  >([]);
  const [openTieBreakerDialog, setOpenTieBreakerDialog] = useState(false);
  const [hasPlayersChanged, setHasPlayersChanged] = useState(false);

  const [duration, setDuration] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (match && match.scoresheet.rounds.length !== players[0]?.rounds.length) {
      setDuration(match.duration);
      setIsRunning(match.running);
      setPlayers(match.players);
    }
  }, [match, players]);

  const router = useRouter();
  const queryClient = useQueryClient();
  const updateMatch = useMutation(
    trpc.match.updateMatch.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.match.getMatch.queryOptions({ id: match?.id ?? 0 }),
        );
        await queryClient.invalidateQueries(
          trpc.game.getGame.queryOptions({ id: match?.gameId ?? 0 }),
        );

        router.push(`/dashboard/games/${match?.gameId}/${match?.id}/summary`);
        setIsSubmitting(false);
      },
    }),
  );
  const updateMatchScores = useMutation(
    trpc.match.updateMatchScores.mutationOptions(),
  );
  const invalidateMatch = async () =>
    queryClient.invalidateQueries(
      trpc.match.getMatch.queryOptions({ id: match?.id ?? 0 }),
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

  const { debouncedRequest, setValue, prepareMatchData } =
    useDebouncedUpdateMatchData({
      match: { id: match?.id ?? 0 },
      roundPlayers: players.flatMap((player) =>
        player.rounds.map((round) => ({
          id: round.id,
          score: round.score,
          roundId: round.id,
          matchPlayerId: player.id,
        })),
      ),
      matchPlayers: players
        .flatMap((player) =>
          player.rounds.map((round) => ({
            id: round.id,
            score: round.score,
            roundId: round.id,
            matchPlayerId: player.id,
          })),
        )
        .map((player) => ({
          id: player.id,
          score: player.score,
          winner: false,
        })),
    });
  const saveMatch = useCallback(() => {
    const { submittedPlayers, matchPlayers } = prepareMatchData(players);
    setValue({
      match: { id: match?.id ?? 0 },
      roundPlayers: submittedPlayers,
      matchPlayers,
    });
    debouncedRequest();
  }, [players, match, debouncedRequest, setValue, prepareMatchData]);
  useEffect(() => {
    if (hasPlayersChanged) {
      saveMatch();
      setHasPlayersChanged(false);
    }
  }, [saveMatch, hasPlayersChanged]);
  useEffect(() => {
    if (
      !openManualWinnerDialog &&
      match?.scoresheet.winCondition === "Manual" &&
      isSubmitting
    ) {
      setIsSubmitting(false);
    }
  }, [isSubmitting, match, openManualWinnerDialog]);
  const onFinish = () => {
    if (isRunning) {
      pauseMatchDuration.mutate({
        id: match?.id ?? 0,
      });
    }
    setIsSubmitting(true);
    setIsRunning(false);
    const submittedPlayers = players.flatMap((player) =>
      player.rounds.map((playerRound) => ({
        id: playerRound.id,
        score: playerRound.score,
      })),
    );
    if (match?.scoresheet.winCondition === "Manual") {
      setManualWinners(
        players.map((player) => {
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
      updateMatchScores.mutate({
        match: {
          id: match.id,
        },
        roundPlayers: submittedPlayers,
        matchPlayers: players.map((player) => {
          return {
            id: player.id,
            score: calculateFinalScore(
              player.rounds.map((round) => ({
                score: round.score,
              })),
              match.scoresheet,
            ),
          };
        }),
      });
      return;
    }

    const playersPlacement = calculatePlacement(
      players.map((player) => ({
        id: player.id,
        rounds: player.rounds.map((round) => ({
          score: round.score,
        })),
        teamId: player.teamId,
      })),
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      match!.scoresheet,
    );
    let isTieBreaker = false;
    const placements: Record<number, number> = {};
    const nonTeamPlayerPlacements = playersPlacement
      .filter((player) => {
        const foundPlayer = players.find((p) => p.id === player.id);
        return foundPlayer?.teamId === null;
      })
      .map((player) => player.placement);
    const teamPlacements = Array.from(
      new Set(
        playersPlacement
          .filter((player) => {
            const foundPlayer = players.find((p) => p.id === player.id);
            return foundPlayer?.teamId !== null;
          })
          .map((player) => {
            {
              const foundPlayer = players.find((p) => p.id === player.id);
              return foundPlayer?.teamId ?? null;
            }
          }),
      ),
    ).map((teamId) => {
      const findFirstPlayer = players.find(
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
          const foundPlayer = players.find((p) => p.id === player.id);
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
      updateMatchScores.mutate({
        match: {
          id: match?.id ?? 0,
        },
        roundPlayers: submittedPlayers,
        matchPlayers: players.map((player) => {
          return {
            id: player.id,
            score: calculateFinalScore(
              player.rounds.map((round) => ({
                score: round.score,
              })),
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              match!.scoresheet,
            ),
          };
        }),
      });
      return;
    } else {
      updateMatch.mutate({
        match: {
          id: match?.id ?? 0,
          duration: duration,
          finished: true,
          running: false,
        },
        roundPlayers: submittedPlayers,
        playersPlacement: playersPlacement,
      });
    }
  };
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        if (!match?.startTime) {
          setDuration((prevDuration) => prevDuration + 1);
        } else {
          const now = new Date();
          const startTime = match.startTime;
          const elapsedTime = differenceInSeconds(now, startTime);
          const totalDuration = match.duration + elapsedTime;
          setDuration(totalDuration);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, match]);

  const toggleClock = () => {
    if (isRunning) {
      pauseMatchDuration.mutate({
        id: match?.id ?? 0,
      });
      setIsRunning(false);
    } else {
      startMatchDuration.mutate({
        id: match?.id ?? 0,
      });
      setIsRunning(true);
    }
  };

  const resetClock = () => {
    resetMatchDuration.mutate({
      id: match?.id ?? 0,
    });
    setDuration(0);
    setIsRunning(false);
  };

  const handleScoreChange = (
    player: Player,
    round: Match["scoresheet"]["rounds"][number],
    value: number | null,
  ) => {
    const temp = [...players];
    const roundPlayer = player.rounds.find(
      (roundPlayer) => roundPlayer.roundId === round.id,
    );
    if (roundPlayer?.score !== undefined) {
      roundPlayer.score = value ?? null;
    }
    setPlayers(temp);

    setHasPlayersChanged(true);
  };
  const handleTeamScoreChange = (
    team: Match["teams"][number],
    round: Match["scoresheet"]["rounds"][number],
    value: number | null,
  ) => {
    const temp = [...players];
    const teamPlayer = players.filter((player) => player.teamId === team.id);
    for (const player of teamPlayer) {
      const roundPlayer = player.rounds.find(
        (roundPlayer) => roundPlayer.roundId === round.id,
      );
      if (roundPlayer?.score !== undefined) {
        roundPlayer.score = value ?? null;
      }
    }
    setPlayers(temp);

    setHasPlayersChanged(true);
  };
  if (!match) return null;
  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-6xl sm:px-4">
        <CardHeader>
          <CardTitle>{`${match.name}`}</CardTitle>
          {match.scoresheet.winCondition === "Target Score" && (
            <CardDescription>{`Target Score: ${match.scoresheet.targetScore}`}</CardDescription>
          )}
        </CardHeader>
        <Card>
          <Table containerClassname="max-h-[65vh] h-fit w-screen sm:w-auto rounded-lg">
            <>
              <TableHeader className="bg-sidebar sticky top-0 z-20 text-card-foreground shadow-lg">
                <HeaderRow match={match} players={players} />
              </TableHeader>
              <TableBody>
                {match.scoresheet.rounds.map((round) => (
                  <BodyRow
                    key={`round-${round.id}`}
                    match={match}
                    round={round}
                    players={players}
                    handleTeamScoreChange={handleTeamScoreChange}
                    handleScoreChange={handleScoreChange}
                  />
                ))}
              </TableBody>
              <TableFooter>
                <CommentsRow match={match} />
                <TotalRow
                  match={match}
                  players={players}
                  setPlayers={setPlayers}
                  setHasPlayersChanged={setHasPlayersChanged}
                />
              </TableFooter>
            </>
          </Table>
        </Card>
        <CardFooter className="flex flex-col gap-2">
          <div className="flex w-full justify-between px-2 pt-6">
            <div className="flex items-center justify-center gap-2">
              <div className="text-center text-2xl font-bold">
                {formatDuration(duration, true)}
              </div>
              <Button onClick={toggleClock} size={"icon"} variant={"outline"}>
                {isRunning ? <Pause /> : <Play />}
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
        </CardFooter>
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
      </div>
    </div>
  );
}

const HeaderRow = ({ match, players }: { match: Match; players: Player[] }) => {
  if (match.teams.length > 0) {
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
        {match.teams
          .filter((team) => players.find((player) => player.teamId === team.id))
          .map((team) => {
            const teamPlayers = players.filter(
              (player) => player.teamId === team.id,
            );
            return (
              <TableHead
                className="min-w-20 text-center"
                scope="col"
                key={team.id}
              >
                <div className="flex max-h-10 w-full flex-col gap-1 overflow-scroll">
                  <span className="font-semibold">{`Team: ${team.name}`}</span>
                  <span>
                    {teamPlayers.map((player) => player.name).join(", ")}
                  </span>
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
              {player.name}
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
          {player.name}
        </TableHead>
      ))}
    </TableRow>
  );
};

const BodyRow = ({
  match,
  players,
  round,
  handleTeamScoreChange,
  handleScoreChange,
}: {
  match: Match;
  players: Player[];
  round: Match["scoresheet"]["rounds"][number];
  handleTeamScoreChange: (
    team: Match["teams"][number],
    round: Match["scoresheet"]["rounds"][number],
    value: number | null,
  ) => void;
  handleScoreChange: (
    player: Player,
    round: Match["scoresheet"]["rounds"][number],
    value: number | null,
  ) => void;
}) => {
  if (match.teams.length > 0) {
    return (
      <TableRow>
        <TableHead
          scope="row"
          className={cn(
            "sticky left-0 z-10 bg-card font-semibold text-muted-foreground after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border sm:text-lg",
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
                      value={roundPlayers[0]?.score ?? ""}
                      onValueChange={(value) => {
                        handleTeamScoreChange(team, round, value);
                      }}
                      className="border-none text-center"
                    />
                  ) : (
                    <>
                      <Label className="hidden">{`Checkbox to toggle score: ${round.score}`}</Label>
                      <Checkbox
                        onCheckedChange={(isChecked) => {
                          handleTeamScoreChange(
                            team,
                            round,
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
                      value={roundPlayer?.score ?? ""}
                      onValueChange={(value) => {
                        handleScoreChange(player, round, value);
                      }}
                      className="border-none text-center"
                    />
                  ) : (
                    <>
                      <Label className="hidden">{`Checkbox to toggle score: ${round.score}`}</Label>
                      <Checkbox
                        onCheckedChange={(isChecked) => {
                          handleScoreChange(
                            player,
                            round,
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
                  value={roundPlayer?.score ?? ""}
                  onValueChange={(value) => {
                    handleScoreChange(player, round, value);
                  }}
                  className="border-none text-center"
                />
              ) : (
                <>
                  <Label className="hidden">{`Checkbox to toggle score: ${round.score}`}</Label>
                  <Checkbox
                    onCheckedChange={(isChecked) => {
                      handleScoreChange(
                        player,
                        round,
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
          className="sticky left-0 bg-muted/50 font-semibold text-muted-foreground after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border sm:text-lg"
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
        className="sticky left-0 bg-muted/50 font-semibold text-muted-foreground after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border sm:text-lg"
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

const TotalRow = ({
  match,
  players,
  setPlayers,
  setHasPlayersChanged,
}: {
  match: Match;
  players: Player[];
  setPlayers: (players: Player[]) => void;
  setHasPlayersChanged: (hasPlayersChanged: boolean) => void;
}) => {
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
          .filter((team) => players.find((player) => player.teamId === team.id))
          .map((team) => {
            const teamPlayer = players.filter(
              (player) => player.teamId === team.id,
            );
            const firstTeamPlayer = teamPlayer[0];
            if (firstTeamPlayer === undefined) return null;
            if (match.scoresheet.roundsScore === "Manual") {
              return (
                <TableCell key={`${team.id}-total`}>
                  <Input
                    type="number"
                    className="text-center"
                    value={firstTeamPlayer.score ?? ""}
                    onChange={(e) => {
                      const score = parseInt(e.target.value);
                      const temp = [...players];
                      const tempTeamPlayer = temp.filter(
                        (player) => player.teamId === team.id,
                      );
                      for (const player of tempTeamPlayer) {
                        player.score = isNaN(score) ? null : score;
                      }
                      setPlayers(temp);
                      setHasPlayersChanged(true);
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
                  <span className="text-center">
                    {total === Infinity ? 0 : total === -Infinity ? 0 : total}
                  </span>
                </div>
              </TableCell>
            );
          })}
        {players
          .filter((player) => player.teamId === null)
          .map((player, index) => {
            if (match.scoresheet.roundsScore === "Manual") {
              return (
                <TableCell key={`${player.id}-total`}>
                  <Input
                    type="number"
                    className="text-center"
                    value={player.score ?? ""}
                    onChange={(e) => {
                      const score = parseInt(e.target.value);
                      const temp = [...players];
                      if (temp[index]?.score !== undefined) {
                        temp[index].score = isNaN(score) ? null : score;
                      }
                      setPlayers(temp);
                      setHasPlayersChanged(true);
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
                  <span className="text-center">
                    {total === Infinity ? 0 : total === -Infinity ? 0 : total}
                  </span>
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
        className="sticky left-0 bg-muted/50 font-semibold text-muted-foreground after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border sm:text-lg"
      >
        Total
      </TableHead>
      {players.map((player, index) => {
        if (match.scoresheet.roundsScore === "Manual") {
          return (
            <TableCell key={`${player.id}-total`}>
              <Input
                type="number"
                className="text-center"
                value={player.score ?? ""}
                onChange={(e) => {
                  const score = parseInt(e.target.value);
                  const temp = [...players];
                  if (temp[index]?.score !== undefined) {
                    temp[index].score = isNaN(score) ? null : score;
                  }
                  setPlayers(temp);
                  setHasPlayersChanged(true);
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
              <span className="text-center">
                {total === Infinity ? 0 : total === -Infinity ? 0 : total}
              </span>
            </div>
          </TableCell>
        );
      })}
    </TableRow>
  );
};

const AddRoundDialog = ({ match }: { match: Match }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <AddRoundDialogContent match={match} setOpen={setIsOpen} />
      </DialogContent>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <ListPlus className="text-secondary-foreground" />
      </Button>
    </Dialog>
  );
};

const RoundSchema = insertRoundSchema.pick({
  name: true,
  type: true,
  color: true,
  score: true,
});
const AddRoundDialogContent = ({
  match,
  setOpen,
}: {
  match: Match;
  setOpen: (isOpen: boolean) => void;
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    schema: RoundSchema,
    defaultValues: {
      name: `Round ${match.scoresheet.rounds.length + 1}`,
      type: "Numeric",
      color: "#cbd5e1",
      score: 0,
    },
  });

  const addRound = useMutation(
    trpc.round.addRound.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.match.getMatch.queryOptions({ id: match.id }),
        );
        router.refresh();
        setIsSubmitting(false);
        setOpen(false);
        form.reset();
      },
    }),
  );
  function onSubmitForm(values: z.infer<typeof RoundSchema>) {
    setIsSubmitting(true);
    addRound.mutate({
      round: {
        ...values,
        order: match.scoresheet.rounds.length + 1,
        scoresheetId: match.scoresheet.id,
      },
      players: match.players.map((player) => ({
        matchPlayerId: player.id,
      })),
    });
  }

  const roundsTypeOptions = roundTypes;
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Round</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-8">
          <div className="w- full flex items-center gap-2">
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="hidden">Round Color</FormLabel>
                  <FormControl>
                    <GradientPicker
                      color={field.value ?? null}
                      setColor={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex flex-grow space-y-0">
                  <FormLabel className="hidden">Round Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Round name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="w-ull flex items-center gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="w-28">
                  <FormLabel>Scoring Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a win condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roundsTypeOptions.map((condition) => (
                        <SelectItem key={condition} value={condition}>
                          {condition}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.getValues("type") === "Checkbox" && (
              <FormField
                control={form.control}
                name={"score"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Score</FormLabel>

                    <FormControl>
                      <NumberInput
                        value={field.value}
                        onValueChange={field.onChange}
                        className="text-center"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="reset"
              variant="secondary"
              onClick={() => {
                form.reset();
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner />
                  <span>Submitting...</span>
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};
