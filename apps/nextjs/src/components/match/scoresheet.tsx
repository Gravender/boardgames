"use client";

import type { z } from "zod/v4";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
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
import {
  useDurationMutation,
  useMatch,
  usePlayersAndTeams,
  useScoresheet,
  useUpdateFinalScores,
  useUpdateFinish,
} from "./hooks/scoresheet";
import { DetailDialog } from "./scoresheet/DetailDialog";
import PlayerEditorDialog from "./scoresheet/edit-player-dialog";
import TeamEditorDialog from "./scoresheet/edit-team-dialog";

type Match = NonNullable<RouterOutputs["newMatch"]["getMatch"]>;
type Player = NonNullable<
  RouterOutputs["newMatch"]["getMatchPlayersAndTeams"]
>["players"][number];
type Team = NonNullable<
  RouterOutputs["newMatch"]["getMatchPlayersAndTeams"]
>["teams"][number];
export function Scoresheet({
  matchId,
  type,
}: {
  matchId: number;
  type: "original" | "shared";
}) {
  const { match } = useMatch(matchId, type);
  return <ScoresheetContent id={match.id} type={match.type} />;
}
function ScoresheetContent({
  id,
  type,
}: {
  id: number;
  type: "original" | "shared";
}) {
  const { match } = useMatch(id, type);
  const { scoresheet } = useScoresheet(id, type);
  return (
    <div className="flex w-full justify-center">
      <div className="flex w-full max-w-6xl flex-col gap-2 px-2 sm:gap-4 sm:px-4">
        <Card>
          <CardHeader className="py-2 sm:py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">{match.name}</CardTitle>
              <Badge variant={scoresheet.isCoop ? "secondary" : "default"}>
                {scoresheet.isCoop ? "Cooperative" : "Competitive"}
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
        {scoresheet.winCondition === "Manual" &&
        scoresheet.rounds.length === 0 ? (
          <ManualScoreSheet match={match} />
        ) : (
          <ScoreSheetTable id={match.id} type={match.type} />
        )}
        <ScoresheetFooter match={match} />
      </div>
    </div>
  );
}
function ManualScoreSheet({ match }: { match: Match }) {
  const trpc = useTRPC();
  const { match: matchData } = useMatch(match.id, match.type);
  const { teams, players } = usePlayersAndTeams(match.id, match.type);
  const { data: roles } = useSuspenseQuery(
    trpc.game.getGameRoles.queryOptions({
      id: matchData.game.id,
      type: "original",
    }),
  );

  const [team, setTeam] = useState<Team | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);

  const mappedTeams = useMemo(() => {
    const mappedTeams = teams
      .map((team) => {
        const teamPlayers = players.filter(
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
  }, [teams, players, roles]);
  const individualPlayers = useMemo(() => {
    return players.filter((player) => player.teamId === null);
  }, [players]);

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
                            match={{ id: match.id, type: match.type }}
                            data={{
                              id: team.id,
                              name: team.name,
                              details: team.details,
                              type: "team",
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
                                      match={{ id: match.id, type: match.type }}
                                      data={{
                                        id: player.id,
                                        name: player.name,
                                        details: player.details,
                                        type: "player",
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
                            match={{ id: match.id, type: match.type }}
                            data={{
                              id: player.id,
                              name: player.name,
                              details: player.details,
                              type: "player",
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
function ScoresheetFooter({ match }: { match: Match }) {
  const { match: matchData } = useMatch(match.id, match.type);
  const { scoresheet } = useScoresheet(match.id, match.type);
  const { teams, players } = usePlayersAndTeams(match.id, match.type);
  const [duration, setDuration] = useState(matchData.duration);
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
          const totalDuration = matchData.duration + elapsedTime;
          setDuration(totalDuration);
        }
      }, 1000);
    } else {
      setDuration(matchData.duration);
    }
    return () => clearInterval(interval);
  }, [match.running, match.startTime, matchData]);

  const router = useRouter();
  const posthog = usePostHog();

  const { startMatch, pauseMatch, resetMatch } = useDurationMutation(
    match.id,
    match.type,
  );

  const { updateFinishMutation } = useUpdateFinish(match.id, match.type);
  const { updateFinalScores } = useUpdateFinalScores(match.id, match.type);

  const toggleClock = () => {
    if (match.running) {
      pauseMatch();
    } else {
      startMatch();
    }
  };

  const resetClock = () => {
    resetMatch();
  };

  const onFinish = () => {
    posthog.capture("match finish begin", {
      gameId: matchData.game.id,
      matchId: match.id,
    });
    if (match.running) {
      pauseMatch();
    }
    setIsSubmitting(true);
    if (scoresheet.winCondition === "Manual") {
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
              scoresheet,
            ),
            teamId: player.teamId,
          };
        }),
      );
      setOpenManualWinnerDialog(true);
      updateFinalScores();
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

      scoresheet,
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
            score: foundPlayer !== undefined ? foundPlayer.score : player.score,
            teamId: foundPlayer?.teamId ?? null,
          };
        }),
      );
      updateFinalScores();
    } else {
      updateFinalScores();
      updateFinishMutation.mutate(
        {
          id: match.id,
          type: match.type,
        },
        {
          onSuccess: () => {
            if (match.type === "original") {
              router.push(
                `/dashboard/games/${match.game.id}/${match.id}/summary`,
              );
            } else {
              router.push(
                `/dashboard/games/shared/${match.game.id}/${match.id}/summary`,
              );
            }
          },
        },
      );
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
            <CommentDialog
              match={{ id: match.id, type: match.type }}
              comment={match.comment}
            />
          </CardContent>
        </Card>
        <MatchImages matchId={match.id} duration={duration} />
      </div>
      <ManualWinnerDialog
        isOpen={openManualWinnerDialog}
        setIsOpen={setOpenManualWinnerDialog}
        game={{
          id: match.game.id,
          type: match.game.type,
        }}
        match={match}
        players={manualWinners}
        teams={teams}
        scoresheet={scoresheet}
      />
      <TieBreakerDialog
        isOpen={openTieBreakerDialog}
        setIsOpen={setOpenTieBreakerDialog}
        game={{
          id: match.game.id,
          type: match.game.type,
        }}
        match={match}
        players={tieBreakers}
        teams={teams}
      />
    </>
  );
}
