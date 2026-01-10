"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  calculatePlacement,
  formatDuration,
  isSameMatchPlayer,
} from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { Label } from "@board-games/ui/label";
import { ScrollArea, ScrollBar } from "@board-games/ui/scroll-area";
import { cn } from "@board-games/ui/utils";

import type { MatchInput } from "./types/input";
import {
  useMatch,
  usePlayersAndTeams,
  useScoresheet,
} from "~/components/match/hooks/suspenseQueries";
import { CommentDialog } from "~/components/match/scoresheet/CommentDialog";
import { ManualWinnerDialog } from "~/components/match/scoresheet/ManualWinnerDialog";
import { MatchImages } from "~/components/match/scoresheet/match-images";
import { ScoreSheetTable } from "~/components/match/scoresheet/table";
import { TieBreakerDialog } from "~/components/match/scoresheet/TieBreakerDialog";
import { Spinner } from "~/components/spinner";
import { formatMatchLink } from "~/utils/linkFormatting";
import { FormattedDate } from "../formatted-date";
import { useGameRoles } from "~/hooks/queries/game/roles";
import {
  useDurationMutation,
  useUpdateFinalScores,
  useUpdateFinish,
} from "./hooks/scoresheet";
import { DetailDialog } from "./scoresheet/DetailDialog";
import PlayerEditorDialog from "./scoresheet/edit-player-dialog";
import TeamEditorDialog from "./scoresheet/edit-team-dialog";

type Player = NonNullable<
  RouterOutputs["newMatch"]["getMatchPlayersAndTeams"]
>["players"][number];
type Team = NonNullable<
  RouterOutputs["newMatch"]["getMatchPlayersAndTeams"]
>["teams"][number];

export function Scoresheet(input: { match: MatchInput }) {
  return <ScoresheetContent match={input.match} />;
}
function ScoresheetContent(input: { match: MatchInput }) {
  const { match } = useMatch(input.match);
  return (
    <div className="flex w-full justify-center">
      <div className="flex w-full max-w-6xl flex-col gap-2 px-2 sm:gap-4 sm:px-4">
        <Card>
          <CardHeader className="py-2 sm:py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">{match.name}</CardTitle>
              <Suspense fallback={null}>
                <ScoreSheetBadge match={input.match} />
              </Suspense>
            </div>
            <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
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
        <Suspense fallback={null}>
          <ScoreSheetTableManualSelector match={input.match} />
        </Suspense>
        <Suspense fallback={null}>
          <ScoresheetFooter match={input.match} />
        </Suspense>
      </div>
    </div>
  );
}
function ScoreSheetBadge(input: { match: MatchInput }) {
  const { scoresheet } = useScoresheet(input.match);
  return (
    <Badge variant={scoresheet.isCoop ? "secondary" : "default"}>
      {scoresheet.isCoop ? "Cooperative" : "Competitive"}
    </Badge>
  );
}
function ScoreSheetTableManualSelector(input: { match: MatchInput }) {
  const { scoresheet } = useScoresheet(input.match);
  if (scoresheet.winCondition === "Manual" && scoresheet.rounds.length === 0)
    return <ManualScoreSheet match={input.match} />;
  return <ScoreSheetTable match={input.match} />;
}
function ManualScoreSheet(input: { match: MatchInput }) {
  const { match } = useMatch(input.match);
  const { teams, players } = usePlayersAndTeams(input.match);
  const { gameRoles } = useGameRoles(
    match.game.type === "original"
      ? {
          id: match.game.id,
          type: "original",
        }
      : {
          sharedGameId: match.game.sharedGameId,
          type: "shared",
        },
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
        const teamRoles = gameRoles.filter((role) => {
          const roleInEveryPlayer = teamPlayers.every((p) =>
            p.roles.some((r) => {
              if (r.type == "original") {
                return r.type === role.type && r.id === role.id;
              }
              return r.type === role.type && r.sharedId === role.sharedId;
            }),
          );
          return roleInEveryPlayer;
        });
        return {
          ...team,
          players: teamPlayers.map((player) => ({
            ...player,
            roles: player.roles.filter(
              (role) =>
                !teamRoles.some((r) => {
                  if (r.type == "original") {
                    return r.type === role.type && r.id === role.id;
                  }
                  return r.type === role.type && r.sharedId === role.sharedId;
                }),
            ),
          })),
          roles: teamRoles,
        };
      })
      .filter((team) => team !== null);
    return mappedTeams;
  }, [teams, players, gameRoles]);
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
                      <CardHeader className="pt-2 pb-0 sm:pt-4">
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
                                  key={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
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
                            match={input.match}
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
                              const foundPlayer = players.find((p) =>
                                isSameMatchPlayer(p, player),
                              );
                              if (!foundPlayer) return null;
                              return (
                                <div
                                  key={`${player.baseMatchPlayerId}-${player.playerId}`}
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
                                      onClick={() => setPlayer(foundPlayer)}
                                    >
                                      <SquarePen className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  <ScrollArea className="w-full overflow-auto">
                                    <div className="hidden items-center gap-2 overflow-visible sm:flex">
                                      {player.roles.map((role) => {
                                        return (
                                          <Badge
                                            key={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
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
                                      match={match}
                                      data={{
                                        id: player.baseMatchPlayerId,
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
                    <Card
                      key={`${player.baseMatchPlayerId}-${player.playerId}`}
                    >
                      <CardHeader className="pt-2 pb-0 sm:pt-4">
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
                                  key={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
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
                            match={match}
                            data={{
                              id: player.baseMatchPlayerId,
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
        matchInput={input.match}
        onClose={() => setTeam(null)}
      />
      <PlayerEditorDialog
        player={player}
        matchInput={input.match}
        onClose={() => setPlayer(null)}
      />
    </>
  );
}
function ScoresheetFooter(input: { match: MatchInput }) {
  const { match } = useMatch(input.match);
  const { scoresheet } = useScoresheet(input.match);
  const { players } = usePlayersAndTeams(input.match);
  const [duration, setDuration] = useState(match.duration);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openManualWinnerDialog, setOpenManualWinnerDialog] = useState(false);
  const [openTieBreakerDialog, setOpenTieBreakerDialog] = useState(false);

  //TODO: fix lint error
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDuration(match.duration);
    }
    return () => clearInterval(interval);
  }, [match.running, match.startTime, match.duration]);

  const router = useRouter();
  const posthog = usePostHog();

  const { startMatch, pauseMatch, resetMatch } = useDurationMutation(
    input.match,
  );

  const { updateFinishMutation } = useUpdateFinish(input.match);
  const { updateFinalScores } = useUpdateFinalScores(input.match);

  const toggleClock = () => {
    if (match.running) {
      pauseMatch();
      if (match.startTime) {
        const now = new Date();
        const startTime = match.startTime;
        const elapsedTime = differenceInSeconds(now, startTime);
        const totalDuration = match.duration + elapsedTime;
        setDuration(totalDuration);
      }
    } else {
      startMatch();
    }
  };

  const resetClock = () => {
    resetMatch();
  };

  const onFinish = () => {
    posthog.capture("match finish begin", {
      gameId: match.game.id,
      matchId: match.id,
    });
    if (match.running) {
      pauseMatch();
    }
    setIsSubmitting(true);
    if (scoresheet.winCondition === "Manual") {
      setOpenManualWinnerDialog(true);
      updateFinalScores();
      return;
    }

    const playersPlacement = calculatePlacement(
      players.map((player) => ({
        id: player.baseMatchPlayerId,
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
        const foundPlayer = players.find(
          (p) => p.baseMatchPlayerId === player.id,
        );
        return foundPlayer?.teamId === null;
      })
      .map((player) => player.placement);
    const teamPlacements = Array.from(
      new Set(
        playersPlacement
          .filter((player) => {
            const foundPlayer = players.find(
              (p) => p.baseMatchPlayerId === player.id,
            );
            return foundPlayer?.teamId !== null;
          })
          .map((player) => {
            {
              const foundPlayer = players.find(
                (p) => p.baseMatchPlayerId === player.id,
              );
              return foundPlayer?.teamId ?? null;
            }
          }),
      ),
    ).map((teamId) => {
      const findFirstPlayer = players.find(
        (player) => player.teamId === teamId,
      );
      const findPlayerPlacement = playersPlacement.find(
        (player) => player.id === findFirstPlayer?.baseMatchPlayerId,
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
      updateFinalScores();
    } else {
      updateFinalScores();
      updateFinishMutation.mutate(input.match, {
        onSuccess: () => {
          if (match.type === "original") {
            router.push(
              formatMatchLink({
                matchId: match.id,
                gameId: match.game.id,
                type: "original",
                finished: true,
              }),
            );
          } else {
            router.push(
              formatMatchLink({
                sharedMatchId: match.sharedMatchId,
                sharedGameId: match.game.sharedGameId,
                linkedGameId: match.game.linkedGameId,
                type: match.game.type,
                finished: true,
              }),
            );
          }
        },
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
          <CardHeader className="pt-2 pb-0 sm:pt-4">
            <CardTitle className="text-xl">Comment:</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <CommentDialog match={match} comment={match.comment} />
          </CardContent>
        </Card>
        <MatchImages matchId={match.id} duration={duration} />
      </div>
      <ManualWinnerDialog
        isOpen={openManualWinnerDialog}
        setIsOpen={setOpenManualWinnerDialog}
        gameAndMatch={
          match.type === "original"
            ? { type: "original", game: match.game, match: match }
            : { type: "shared", game: match.game, match: match }
        }
        scoresheet={scoresheet}
      />
      <TieBreakerDialog
        isOpen={openTieBreakerDialog}
        setIsOpen={setOpenTieBreakerDialog}
        gameAndMatch={
          match.type === "original"
            ? { type: "original", game: match.game, match: match }
            : { type: "shared", game: match.game, match: match }
        }
        scoresheet={scoresheet}
      />
    </>
  );
}
