"use client";

import type { z } from "zod/v4";
import { useEffect, useMemo, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { differenceInSeconds } from "date-fns";
import {
  Calendar,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  SquarePen,
} from "lucide-react";
import { usePostHog } from "posthog-js/react";

import type { RouterOutputs } from "@board-games/api";
import {
  calculateFinalScore,
  calculatePlacement,
  formatDuration,
} from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { Label } from "@board-games/ui/label";
import { ScrollArea, ScrollBar } from "@board-games/ui/scroll-area";
import { toast } from "@board-games/ui/toast";
import { cn } from "@board-games/ui/utils";

import type { ManualWinnerPlayerSchema } from "~/components/match/scoresheet/ManualWinnerDialog";
import type { TieBreakerPlayerSchema } from "~/components/match/scoresheet/TieBreakerDialog";
import { CommentDialog } from "~/components/match/scoresheet/CommentDialog";
import { ManualWinnerDialog } from "~/components/match/scoresheet/ManualWinnerDialog";
import { MatchImages } from "~/components/match/scoresheet/match-images";
import { ScoreSheetTable } from "~/components/match/scoresheet/table";
import { TieBreakerDialog } from "~/components/match/scoresheet/TieBreakerDialog";
import { Spinner } from "~/components/spinner";
import { useTRPC } from "~/trpc/react";
import { FormattedDate } from "../formatted-date";
import { DetailDialog } from "./scoresheet/DetailDialog";
import PlayerEditorDialog from "./scoresheet/edit-player-dialog";
import TeamEditorDialog from "./scoresheet/edit-team-dialog";

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
      <div className="flex w-full max-w-6xl flex-col gap-2 px-2 sm:gap-4 sm:px-4">
        <Card>
          <CardHeader className="py-2 sm:py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">{match.name}</CardTitle>
              <Badge
                variant={match.scoresheet.isCoop ? "secondary" : "default"}
              >
                {match.scoresheet.isCoop ? "Cooperative" : "Competitive"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <FormattedDate Icon={Calendar} date={match.date} />
              {match.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {match.location.name}
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
        {match.scoresheet.winCondition === "Manual" &&
        match.scoresheet.rounds.length === 0 ? (
          <ManualScoreSheet match={match} />
        ) : (
          <ScoreSheetTable match={match} />
        )}
        <ScoresheetFooter match={match} />
      </div>
    </div>
  );
}
function ManualScoreSheet({ match }: { match: Match }) {
  const trpc = useTRPC();
  const { data: roles } = useSuspenseQuery(
    trpc.game.getGameRoles.queryOptions({ id: match.gameId, type: "original" }),
  );

  const [team, setTeam] = useState<Team | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);

  const mappedTeams = useMemo(() => {
    const mappedTeams = match.teams
      .map((team) => {
        const teamPlayers = match.players.filter(
          (player) => player.teamId === team.id,
        );
        if (teamPlayers.length === 0) return null;
        const teamRoles = roles.filter((role) => {
          const roleInEveryPlayer = teamPlayers.every((p) =>
            p.roles.some((r) => r.id === role.id),
          );
          return roleInEveryPlayer;
        });
        return {
          ...team,
          players: teamPlayers.map((player) => ({
            ...player,
            roles: player.roles.filter(
              (role) => !teamRoles.some((r) => r.id === role.id),
            ),
          })),
          roles: teamRoles,
        };
      })
      .filter((team) => team !== null);
    return mappedTeams;
  }, [match, roles]);
  const individualPlayers = useMemo(() => {
    return match.players.filter((player) => player.teamId === null);
  }, [match]);

  return (
    <>
      <ScrollArea>
        <div className="flex max-h-[60vh] flex-col gap-4 sm:max-h-[70vh]">
          {mappedTeams.length > 0 && (
            <ScrollArea>
              <div
                className={cn(
                  "grid max-h-[50vh] grid-cols-1 gap-4 sm:max-h-[60vh]",
                  mappedTeams.length >= 2 && "sm:grid-cols-2",
                  mappedTeams.length >= 3 && "md:grid-cols-3",
                  mappedTeams.length >= 4 && "xl:grid-cols-4",
                )}
              >
                {mappedTeams.map((team) => {
                  return (
                    <Card key={team.id}>
                      <CardHeader className="pb-0 pt-2 sm:pt-4">
                        <CardTitle className="flex items-center justify-between gap-2 text-xl">
                          {team.name}
                          <Button
                            variant="ghost"
                            type="button"
                            size="icon"
                            onClick={() => setTeam(team)}
                          >
                            <SquarePen className="h-4 w-4" />
                          </Button>
                        </CardTitle>

                        <ScrollArea className="w-full overflow-auto">
                          <div className="hidden items-center gap-2 overflow-visible sm:flex">
                            {team.roles.map((role) => {
                              return (
                                <Badge
                                  key={role.id}
                                  variant="outline"
                                  className="text-nowrap"
                                >
                                  {role.name}
                                </Badge>
                              );
                            })}
                          </div>
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-muted-foreground">
                          <Label className="text-sm font-medium">
                            Team Notes
                          </Label>
                          <DetailDialog
                            matchId={match.id}
                            data={{
                              id: team.id,
                              name: team.name,
                              details: team.details,
                              type: "Team",
                            }}
                            placeholder="No notes for this team"
                          />
                        </div>
                        <ScrollArea>
                          <div className="flex max-h-[20vh] flex-col gap-2">
                            {team.players.map((player) => {
                              return (
                                <div
                                  key={`${player.id}-${player.playerId}`}
                                  className="flex flex-col rounded-lg border p-3"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium">
                                      {player.name}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      type="button"
                                      size="icon"
                                      className="font-semibold"
                                      onClick={() => setPlayer(player)}
                                    >
                                      <SquarePen className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  <ScrollArea className="w-full overflow-auto">
                                    <div className="hidden items-center gap-2 overflow-visible sm:flex">
                                      {player.roles.map((role) => {
                                        return (
                                          <Badge
                                            key={role.id}
                                            variant="outline"
                                            className="text-nowrap"
                                          >
                                            {role.name}
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                    <ScrollBar orientation="horizontal" />
                                  </ScrollArea>
                                  <div className="text-muted-foreground">
                                    <Label className="text-xs font-medium">
                                      Player Notes
                                    </Label>
                                    <DetailDialog
                                      matchId={match.id}
                                      data={{
                                        id: player.id,
                                        name: player.name,
                                        details: player.details,
                                        type: "Player",
                                      }}
                                      placeholder="No notes for this player"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
          {individualPlayers.length > 0 && (
            <ScrollArea>
              <div
                className={cn(
                  "grid max-h-[50vh] grid-cols-1 gap-4 sm:max-h-[60vh]",
                  individualPlayers.length >= 2 && "sm:grid-cols-2",
                  individualPlayers.length >= 3 && "md:grid-cols-3",
                  individualPlayers.length >= 4 && "xl:grid-cols-4",
                )}
              >
                {individualPlayers.map((player) => {
                  return (
                    <Card key={`${player.id}-${player.playerId}`}>
                      <CardHeader className="pb-0 pt-2 sm:pt-4">
                        <CardTitle className="flex items-center justify-between gap-2 text-xl">
                          {player.name}
                          <Button
                            variant="ghost"
                            type="button"
                            size="icon"
                            className="font-semibold"
                            onClick={() => setPlayer(player)}
                          >
                            <SquarePen className="h-4 w-4" />
                          </Button>
                        </CardTitle>
                        <ScrollArea className="hidden w-full overflow-auto sm:relative">
                          <div className="hidden items-center gap-2 overflow-visible sm:flex">
                            {player.roles.map((role) => {
                              return (
                                <Badge
                                  key={role.id}
                                  variant="outline"
                                  className="text-nowrap"
                                >
                                  {role.name}
                                </Badge>
                              );
                            })}
                          </div>
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      </CardHeader>
                      <CardContent>
                        <div className="text-muted-foreground">
                          <Label className="text-sm font-medium">
                            Player Notes
                          </Label>
                          <DetailDialog
                            matchId={match.id}
                            data={{
                              id: player.id,
                              name: player.name,
                              details: player.details,
                              type: "Player",
                            }}
                            placeholder="No notes for this player"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </ScrollArea>
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
  const posthog = usePostHog();

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
        posthog.capture("match finished", {
          gameId: match.gameId,
          matchId: match.id,
          type: "standard",
        });

        router.push(`/dashboard/games/${match.gameId}/${match.id}/summary`);
        setIsSubmitting(false);
      },
      onError: (error) => {
        posthog.capture("match finished error", { error });
        toast.error("Error", {
          description: "There was a problem finishing your match.",
        });
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
    posthog.capture("match finish begin", {
      gameId: match.gameId,
      matchId: match.id,
    });
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
      <div className="flex flex-col gap-2 pb-0">
        <div className="flex w-full justify-between p-2">
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

        <Card className="pb-2">
          <CardHeader className="pb-0 pt-2 sm:pt-4">
            <CardTitle className="text-xl">Comment:</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <CommentDialog matchId={match.id} comment={match.comment} />
          </CardContent>
        </Card>
        <MatchImages matchId={match.id} duration={duration} />
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
