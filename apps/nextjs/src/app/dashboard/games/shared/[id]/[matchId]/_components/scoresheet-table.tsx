"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { RouterOutputs } from "@board-games/api";
import {
  calculateFinalScore,
  calculatePlacement,
  formatDuration,
} from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
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
  DialogTrigger,
} from "@board-games/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@board-games/ui/form";
import { Input } from "@board-games/ui/input";
import { Label } from "@board-games/ui/label";
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
import { Textarea } from "@board-games/ui/textarea";
import { cn } from "@board-games/ui/utils";

import type { ManualWinnerPlayerSchema } from "./shared-manual-winner-dialog";
import type { TieBreakerPlayerSchema } from "./shared-tie-breaker-dialog";
import { NumberInput } from "~/components/number-input";
import { Spinner } from "~/components/spinner";
import { useDebouncedCallback } from "~/hooks/use-debounce";
import { useTRPC } from "~/trpc/react";
import { ManualWinnerDialog } from "./shared-manual-winner-dialog";
import { TieBreakerDialog } from "./shared-tie-breaker-dialog";

type Match = NonNullable<RouterOutputs["sharing"]["getSharedMatch"]>;
type Player = Match["players"][number];

export function ScoreSheetTable({ matchId }: { matchId: number }) {
  const trpc = useTRPC();
  const { data: match } = useSuspenseQuery(
    trpc.sharing.getSharedMatch.queryOptions({ id: matchId }),
  );

  const [players, setPlayers] = useState<Player[]>([]);
  const [duration, setDuration] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [manualWinners, setManualWinners] = useState<
    z.infer<typeof ManualWinnerPlayerSchema>
  >([]);
  const [openManualWinnerDialog, setOpenManualWinnerDialog] = useState(false);
  const [tieBreakers, setTieBreakers] = useState<
    z.infer<typeof TieBreakerPlayerSchema>
  >([]);
  const [openTieBreakerDialog, setOpenTieBreakerDialog] = useState(false);

  useEffect(() => {
    if (match && match.scoresheet.rounds.length !== players[0]?.rounds.length) {
      setDuration(match.duration);

      setIsRunning(match.running);
      setPlayers(match.players);
    }
  }, [match, players]);

  const router = useRouter();
  const queryClient = useQueryClient();
  const updateSharedMatchPlayer = useMutation(
    trpc.sharing.updateSharedMatchPlayer.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.sharing.getSharedMatch.queryOptions({ id: matchId }),
        );
      },
    }),
  );
  const updateShareMatchTeam = useMutation(
    trpc.sharing.updateShareMatchTeam.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.sharing.getSharedMatch.queryOptions({ id: matchId }),
        );
      },
    }),
  );
  const updateSharedMatchDuration = useMutation(
    trpc.sharing.updateSharedMatchDuration.mutationOptions(),
  );
  const updateSharedMatchToggleRunning = useMutation(
    trpc.sharing.updateSharedMatchToggleRunning.mutationOptions(),
  );
  const updateSharedMatchFinish = useMutation(
    trpc.sharing.updateSharedMatchFinish.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.sharing.getSharedMatch.queryOptions({ id: match?.id ?? 0 }),
        );
        void queryClient.invalidateQueries(
          trpc.sharing.getSharedGame.queryOptions({ id: match?.gameId ?? 0 }),
        );
        router.push(
          `/dashboard/games/shared/${match?.gameId}/${match?.id}/summary`,
        );
      },
    }),
  );
  const updateSharedMatchScores = useMutation(
    trpc.sharing.updateShareMatchScores.mutationOptions(),
  );
  const debouncedPlayerUpdate = useDebouncedCallback(
    (playerId: number, roundId: number, score: number | null) => {
      if (match !== null) {
        updateSharedMatchPlayer.mutate({
          match: { id: match.id },
          sharedMatchPlayer: { id: playerId },
          round: {
            id: roundId,
            score,
          },
        });
      }
    },
    1000,
  );
  const debouncedTeamUpdate = useDebouncedCallback(
    (teamId: number, roundId: number, score: number | null) => {
      if (match !== null) {
        updateShareMatchTeam.mutate({
          match: { id: match.id },
          team: { id: teamId },
          round: {
            id: roundId,
            score,
          },
        });
      }
    },
    1000,
  );

  const handleScoreChange = useCallback(
    (
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

      debouncedPlayerUpdate(player.id, round.id, value ?? null);
    },
    [players, setPlayers, debouncedPlayerUpdate],
  );
  const handleTeamScoreChange = useCallback(
    (
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

      debouncedTeamUpdate(team.id, round.id, value ?? null);
    },
    [players, setPlayers, debouncedTeamUpdate],
  );

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setDuration((prevDuration) => prevDuration + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (
      match !== null &&
      isRunning &&
      duration % 15 === 0 &&
      match.duration !== duration
    ) {
      const debounce = setTimeout(() => {
        updateSharedMatchDuration.mutate({
          match: { id: match.id },
          duration: duration,
        });
      }, 1000); // Debounce duration
      return () => clearTimeout(debounce);
    }
  }, [isRunning, duration, match, updateSharedMatchDuration]);

  const onFinish = () => {
    setIsRunning(false);
    if (match?.scoresheet.winCondition === "Manual") {
      setManualWinners(
        players.map((player) => {
          return {
            matchPlayerId: player.matchPlayerId,
            name: player.name,
            imageUrl: player.imageUrl ?? null,
            score: calculateFinalScore(
              player.rounds.map((round) => ({
                score: round.score ?? 0,
              })),
              match.scoresheet,
            ),
            teamId: player.teamId,
          };
        }),
      );
      setOpenManualWinnerDialog(true);
      updateSharedMatchScores.mutate({
        match: {
          id: match.id,
        },
        duration: duration,
        players: players.map((player) => {
          return {
            matchPlayerId: player.matchPlayerId,
            score: calculateFinalScore(
              player.rounds.map((round) => ({
                score: round.score ?? 0,
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
          score: round.score ?? 0,
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
            imageUrl: foundPlayer?.imageUrl ?? "",
            placement: player.placement,
            score: player.score,
            teamId: foundPlayer?.teamId ?? null,
          };
        }),
      );
      updateSharedMatchScores.mutate({
        match: {
          id: match?.id ?? 0,
        },
        duration: duration,
        players: players.map((player) => {
          return {
            matchPlayerId: player.matchPlayerId,
            score: calculateFinalScore(
              player.rounds.map((round) => ({
                score: round.score ?? 0,
              })),
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              match!.scoresheet,
            ),
          };
        }),
      });
      return;
    } else {
      updateSharedMatchFinish.mutate({
        match: {
          id: match?.id ?? 0,
        },
        finished: true,
        duration: duration,
        playersPlacement: playersPlacement.map((player) => ({
          matchPlayerId: player.id,
          score: player.score,
          placement: player.placement,
        })),
      });
    }
  };

  const toggleClock = () => {
    if (match !== null && match.permission === "edit") {
      updateSharedMatchToggleRunning.mutate({
        match: { id: match.id },
        running: !match.running,
      });
      setIsRunning(!isRunning);
    }
  };

  const resetClock = () => {
    if (match !== null && match.permission === "edit") {
      updateSharedMatchDuration.mutate({
        match: { id: match.id },
        duration: 0,
      });
      setDuration(0);
    }
  };

  if (!match) return null;
  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-6xl sm:px-4">
        <CardHeader>
          <CardTitle>
            {`${match.name}`}
            {match.permission === "edit" ? (
              <Badge variant="outline" className="ml-2">
                Edit
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-2">
                View
              </Badge>
            )}
          </CardTitle>
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
                />
              </TableFooter>
            </>
          </Table>
        </Card>
        <CardFooter className="flex flex-col gap-2">
          <div className="flex w-full justify-between px-2 pt-6">
            <div className="flex items-center justify-center gap-2">
              <div className="text-center text-2xl font-bold">
                {formatDuration(duration)}
              </div>
              <Button
                onClick={toggleClock}
                size={"icon"}
                variant={"outline"}
                disabled={match.permission === "view"}
              >
                {isRunning ? <Pause /> : <Play />}
              </Button>
              <Button
                onClick={resetClock}
                size={"icon"}
                variant={"outline"}
                disabled={match.permission === "view"}
              >
                <RotateCcw />
              </Button>
            </div>
            <Button
              onClick={() => {
                onFinish();
              }}
              disabled={
                updateSharedMatchFinish.isPending || match.permission === "view"
              }
            >
              {updateSharedMatchFinish.isPending ? (
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
          <div className="flex w-full items-start">
            <CommentDialog matchId={match.id} comment={match.comment} />
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
          <div></div>
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
        <div></div>
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
            round.color &&
              "over:opacity-50 text-slate-600 hover:dark:opacity-80",
          )}
          style={{
            backgroundColor: round.color ?? "",
          }}
        >
          <span>{round.name}</span>
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
                      value={roundPlayers[0]?.score ?? 0}
                      onValueChange={(value) => {
                        handleTeamScoreChange(team, round, value);
                      }}
                      className="border-none text-center"
                      disabled={teamPlayer[0]?.permission === "view"}
                    />
                  ) : (
                    <>
                      <Label className="hidden">{`Checkbox to toggle score: ${round.score}`}</Label>
                      <Checkbox
                        onCheckedChange={(isChecked) => {
                          handleTeamScoreChange(
                            team,
                            round,
                            isChecked ? round.score : 0,
                          );
                        }}
                        checked={(roundPlayers[0]?.score ?? 0) === round.score}
                        disabled={teamPlayer[0]?.permission === "view"}
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
                      value={roundPlayer?.score ?? 0}
                      onValueChange={(value) => {
                        handleScoreChange(player, round, value);
                      }}
                      className="border-none text-center"
                      disabled={player.permission === "view"}
                    />
                  ) : (
                    <>
                      <Label className="hidden">{`Checkbox to toggle score: ${round.score}`}</Label>
                      <Checkbox
                        onCheckedChange={(isChecked) => {
                          handleScoreChange(
                            player,
                            round,
                            isChecked ? round.score : 0,
                          );
                        }}
                        checked={(roundPlayer?.score ?? 0) === round.score}
                        disabled={player.permission === "view"}
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
          round.color &&
            "text-slate-600 hover:opacity-50 hover:dark:opacity-80",
        )}
        style={{
          backgroundColor: round.color ?? "",
        }}
      >
        {round.name}
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
                  value={roundPlayer?.score ?? 0}
                  onValueChange={(value) => {
                    handleScoreChange(player, round, value);
                  }}
                  className="border-none text-center"
                  disabled={player.permission === "view"}
                />
              ) : (
                <>
                  <Label className="hidden">{`Checkbox to toggle score: ${round.score}`}</Label>
                  <Checkbox
                    onCheckedChange={(isChecked) => {
                      handleScoreChange(
                        player,
                        round,
                        isChecked ? round.score : 0,
                      );
                    }}
                    checked={(roundPlayer?.score ?? 0) === round.score}
                    disabled={player.permission === "view"}
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
                  permission: match.permission,
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
                    id: player.matchPlayerId,
                    name: player.name,
                    details: player.details,
                    type: "Player",

                    permission: player.permission,
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
                id: player.matchPlayerId,
                name: player.name,
                details: player.details,
                type: "Player",
                permission: player.permission,
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
}: {
  match: Match;
  players: Player[];
  setPlayers: (players: Player[]) => void;
}) => {
  if (match.teams.length > 0) {
    return (
      <TableRow>
        <TableHead
          scope="row"
          className="sticky left-0 bg-muted/50 font-semibold text-muted-foreground after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border sm:text-lg"
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
                    value={firstTeamPlayer.score ?? 0}
                    onChange={(e) => {
                      const score = Number(e.target.value);
                      const temp = [...players];
                      const tempTeamPlayer = temp.filter(
                        (player) => player.teamId === team.id,
                      );
                      for (const player of tempTeamPlayer) {
                        player.score = score;
                      }
                      setPlayers(temp);
                    }}
                    disabled={teamPlayer[0]?.permission === "view"}
                  />
                </TableCell>
              );
            }

            const total = calculateFinalScore(
              firstTeamPlayer.rounds.map((round) => ({
                score: round.score ?? 0,
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
                    value={player.score ?? 0}
                    onChange={(e) => {
                      const score = Number(e.target.value);
                      const temp = [...players];
                      if (temp[index]?.score !== undefined) {
                        temp[index].score = score;
                      }
                      setPlayers(temp);
                    }}
                    disabled={player.permission === "view"}
                  />
                </TableCell>
              );
            }
            const total = calculateFinalScore(
              player.rounds.map((round) => ({
                score: round.score ?? 0,
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
                value={player.score ?? 0}
                onChange={(e) => {
                  const score = Number(e.target.value);
                  const temp = [...players];
                  if (temp[index]?.score !== undefined) {
                    temp[index].score = score;
                  }
                  setPlayers(temp);
                }}
                disabled={player.permission === "view"}
              />
            </TableCell>
          );
        }
        const total = calculateFinalScore(
          player.rounds.map((round) => ({
            score: round.score ?? 0,
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

function DetailDialog({
  matchId,
  data,
}: {
  matchId: number;
  data: {
    id: number;
    name: string;
    details: string | null;
    type: "Player" | "Team";
    permission: "view" | "edit";
  };
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="h-full w-full min-w-20 items-start justify-start p-0"
          disabled={data.permission === "view"}
        >
          <span className="max-h-10 min-h-6 overflow-scroll text-wrap text-start text-base text-primary">
            {data.details ?? ""}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DetailContent setIsOpen={setIsOpen} matchId={matchId} data={data} />
      </DialogContent>
    </Dialog>
  );
}
const DetailDialogFormSchema = z.object({
  detail: z.string(),
});
function DetailContent({
  matchId,
  data,
  setIsOpen,
}: {
  matchId: number;
  data: {
    id: number;
    name: string;
    details: string | null;
    type: "Player" | "Team";
  };
  setIsOpen: (isOpen: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateSharedMatchPlayerDetails = useMutation(
    trpc.sharing.updateSharedMatchPlayerDetails.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.sharing.getSharedMatch.queryOptions({ id: matchId }),
        );
        setIsOpen(false);
      },
    }),
  );
  const form = useForm<z.infer<typeof DetailDialogFormSchema>>({
    resolver: zodResolver(DetailDialogFormSchema),
    defaultValues: { detail: data.details ?? "" },
  });
  function onSubmitForm(values: z.infer<typeof DetailDialogFormSchema>) {
    updateSharedMatchPlayerDetails.mutate({
      match: { id: matchId },
      id: data.id,
      type: data.type,
      details: values.detail,
    });
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {data.type === "Team" ? `Team: ${data.name}` : data.name}
        </DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-8">
          <FormField
            control={form.control}
            name="detail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Details:</FormLabel>
                <FormControl>
                  <Textarea className="resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter className="flex gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Ok</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}

function CommentDialog({
  matchId,
  comment,
}: {
  matchId: number;
  comment: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="h-fit min-w-[50%] items-start justify-start"
        >
          <span className="text-lg font-semibold text-primary">Comment:</span>
          <span className="text-wrap text-start text-base text-primary">
            {comment ?? "No comment"}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <CommentContent
          setIsOpen={setIsOpen}
          matchId={matchId}
          comment={comment ?? ""}
        />
      </DialogContent>
    </Dialog>
  );
}
const CommentFormSchema = z.object({
  comment: z.string(),
});
function CommentContent({
  matchId,
  comment,
  setIsOpen,
}: {
  matchId: number;
  setIsOpen: (isOpen: boolean) => void;
  comment: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateComment = useMutation(
    trpc.sharing.updateSharedMatchComment.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.sharing.getSharedMatch.queryOptions({ id: matchId }),
        );

        setIsOpen(false);
      },
    }),
  );
  const form = useForm<z.infer<typeof CommentFormSchema>>({
    resolver: zodResolver(CommentFormSchema),
    defaultValues: { comment },
  });
  function onSubmitForm(values: z.infer<typeof CommentFormSchema>) {
    updateComment.mutate({
      match: { id: matchId },
      comment: values.comment,
    });
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle>Match Comment</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-8">
          <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="hidden">Comment:</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter className="flex gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Ok</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
