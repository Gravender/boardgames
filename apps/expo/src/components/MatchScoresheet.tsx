/* eslint-disable */
// TODO: Finish implementing

import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { z } from "zod";

import {
  calculateFinalScore,
  calculateWinners,
  formatDuration,
} from "@board-games/shared";

import type { RouterOutputs } from "~/utils/api";
import { Pause } from "~/lib/icons/Pause";
import { Play } from "~/lib/icons/Play";
import { RotateCcw } from "~/lib/icons/RotateCcw";
import { cn } from "~/lib/utils";
import { api } from "~/utils/api";
import { Button } from "./ui/button";
import { CardFooter } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
import { TableCell, TableHead, TableRow } from "./ui/table";
import { Text } from "./ui/text";

type Match = NonNullable<RouterOutputs["match"]["getMatch"]>;
type ScoreSheet = Match["scoresheet"];
type Player = Match["players"][number];
type Round = Match["scoresheet"]["rounds"][number];
const ManualWinnerPlayerSchema = z
  .array(
    z.object({
      id: z.number(),
      name: z.string(),
      imageUrl: z.string().nullable(),
      score: z.number(),
    }),
  )
  .min(1);

export function MatchScoresheet({ data }: { data: Match }) {
  const [players, setPlayers] = useState<Player[]>(() => [...data.players]);
  const [manualWinners, setManualWinners] = useState<
    z.infer<typeof ManualWinnerPlayerSchema>
  >([]);
  const [openManualWinnerDialog, setOpenManualWinnerDialog] = useState(false);
  const [hasPlayersChanged, setHasPlayersChanged] = useState(false);

  const [duration, setDuration] = useState(data.duration);
  const [isRunning, setIsRunning] = useState(data.running);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const topScrollViewRef = useRef<ScrollView>(null);
  const bottomScrollViewRef = useRef<ScrollView>(null);

  const [isTopScrollEnabled, setIsTopScrollEnabled] = useState(true);
  const [isBottomScrollEnabled, setIsBottomScrollEnabled] = useState(true);

  const handleTopScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isTopScrollEnabled) {
      setIsBottomScrollEnabled(false);
      const offsetX = event.nativeEvent.contentOffset.x;
      bottomScrollViewRef.current?.scrollTo({ x: offsetX, animated: false });

      // Re-enable bottom scroll after syncing
      setTimeout(() => setIsBottomScrollEnabled(true), 50);
    }
  };

  const handleBottomScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (isBottomScrollEnabled) {
      setIsTopScrollEnabled(false);
      const offsetX = event.nativeEvent.contentOffset.x;
      topScrollViewRef.current?.scrollTo({ x: offsetX, animated: false });

      // Re-enable top scroll after syncing
      setTimeout(() => setIsTopScrollEnabled(true), 50);
    }
  };

  const utils = api.useUtils();
  const router = useRouter();

  const updateMatch = api.match.updateMatch.useMutation({
    onSuccess: async () => {
      await utils.match.getMatch.invalidate({ id: data.id });
      await utils.game.getGame.invalidate({ id: data.gameId });

      router.push(`/games/${data.gameId}/${data.id}/summary`);
      setIsSubmitting(false);
    },
  });
  const updateMatchScores = api.match.updateMatchScores.useMutation();
  const updateMatchDuration = api.match.updateMatchDuration.useMutation();

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
    if (isRunning && duration % 30 === 0 && data.duration !== duration) {
      const debounce = setTimeout(() => {
        updateMatchDuration.mutate({
          match: { id: data.id },
          duration: duration,
        });
      }, 1000);
      return () => clearTimeout(debounce);
    }
  }, [isRunning, duration, data, updateMatchDuration]);

  const onFinish = () => {
    setIsSubmitting(true);
    setIsRunning(false);
    const submittedPlayers = players.flatMap((player) =>
      player.rounds.map((round) => ({
        id: round.id,
        score: round.score,
        roundId: round.id,
        matchPlayerId: player.id,
      })),
    );

    if (data.scoresheet.winCondition === "Manual") {
      setManualWinners(
        players.map((player) => ({
          id: player.id,
          name: player.name,
          imageUrl: player.imageUrl ?? null,
          score: calculateFinalScore(
            player.rounds.map((round) => ({
              score: round.score ?? 0,
            })),
            data.scoresheet,
          ),
        })),
      );
      setOpenManualWinnerDialog(true);
      updateMatchScores.mutate({
        match: {
          id: data.id,
          duration: duration,
          running: false,
        },
        roundPlayers: submittedPlayers,
        matchPlayers: players.map((player) => ({
          id: player.id,
          score: calculateFinalScore(
            player.rounds.map((round) => ({
              score: round.score ?? 0,
            })),
            data.scoresheet,
          ),
        })),
      });
      return;
    }

    const winners = calculateWinners(
      players.map((player) => ({
        id: player.id,
        rounds: player.rounds.map((round) => ({
          score: round.score ?? 0,
        })),
      })),
      data.scoresheet,
    );

    updateMatch.mutate({
      match: {
        id: data.id,
        duration: duration,
        finished: true,
        running: false,
      },
      roundPlayers: submittedPlayers,
      matchPlayers: players.map((player) => ({
        id: player.id,
        score: calculateFinalScore(
          player.rounds.map((round) => ({
            score: round.score ?? 0,
          })),
          data.scoresheet,
        ),
        winner: winners.find((winner) => winner.id === player.id) !== undefined,
      })),
    });
  };

  const toggleClock = () => {
    setIsRunning(!isRunning);
    setHasPlayersChanged(true);
  };

  const resetClock = () => {
    setDuration(0);
  };

  const handleScoreChange = (
    playerRound: Player["rounds"][number],
    round: Match["scoresheet"]["rounds"][number],
    value: number | string | null,
  ) => {
    let newScore: number | null = null;

    if (typeof value === "string") {
      // Handle empty string case
      if (value === "") {
        newScore = null;
      } else {
        // Only parse if it's a valid number string
        const parsed = parseInt(value);
        if (!isNaN(parsed)) {
          newScore = parsed;
        }
      }
    } else {
      newScore = value;
    }
    setPlayers((prevPlayers) => {
      const foundPlayer = prevPlayers.find(
        (p) => p.id === playerRound.matchPlayerId,
      );
      if (foundPlayer) {
        const foundRound = foundPlayer.rounds.find(
          (r) => r.roundId === round.id,
        );
        if (foundRound) {
          foundRound.score = newScore;
        }
      }
      return prevPlayers;
    });
    setHasPlayersChanged(true);
  };
  const updatePlayerScore = (player: Player, score: number | null) => {
    setPlayers((prevPlayers) => {
      const foundPlayer = prevPlayers.find((p) => p.id === player.id);
      if (foundPlayer) {
        foundPlayer.score = score;
      }
      return prevPlayers;
    });
    setHasPlayersChanged(true);
  };

  return (
    <View className="flex flex-col gap-2" style={{ flex: 1, height: "100%" }}>
      <SafeAreaView style={{ height: "80%" }}>
        <ScrollView stickyHeaderIndices={[0]}>
          {/* Sticky Header */}
          <TableRow className="h-14 bg-accent">
            <TableHead className="w-28">
              <Button size="icon"></Button>
            </TableHead>

            <ScrollView
              horizontal
              ref={topScrollViewRef}
              onScroll={handleTopScroll}
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
            >
              {data.players.map((player, playerIndex) => {
                if (playerIndex > 0 && playerIndex < players.length) {
                  return (
                    <View
                      key={`${player.id}-header}`}
                      className="flex flex-row items-center justify-center"
                    >
                      <Separator orientation="vertical" className="h-4" />
                      <PlayerHeaderCell player={player} />
                    </View>
                  );
                } else {
                  return (
                    <PlayerHeaderCell
                      key={`${player.id}-header}`}
                      player={player}
                    />
                  );
                }
              })}
            </ScrollView>
          </TableRow>

          <View className="flex flex-row">
            {/* Rounds Table */}
            <View className="shadow-offset-[4px,0] bg-card shadow-lg shadow-black/80">
              {data.scoresheet.rounds.map((round) => (
                <TableRow
                  key={round.id}
                  className="flex h-16 flex-row items-center justify-center"
                >
                  <RoundHeaderCell round={round} />
                </TableRow>
              ))}
              <TableRow className="flex h-16 flex-row items-center justify-center">
                <TotalCell />
              </TableRow>
            </View>
            <ScrollView
              horizontal
              ref={bottomScrollViewRef}
              onScroll={handleBottomScroll}
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
            >
              <View>
                {data.scoresheet.rounds.map((round) => (
                  <TableRow key={round.id} className="h-16">
                    {players.map((player, playerIndex) => {
                      const roundPlayer = player.rounds.find(
                        (r) => r.roundId === round.id,
                      );
                      if (!roundPlayer) return null;
                      if (playerIndex > 0 && playerIndex < players.length) {
                        return (
                          <View
                            key={`${player.id}-${round.id}`}
                            className="flex flex-row items-center justify-center"
                          >
                            <Separator
                              orientation="vertical"
                              className="h-8 font-bold"
                            />
                            <PlayerRoundCell
                              playerRound={roundPlayer}
                              round={round}
                              updateScore={handleScoreChange}
                            />
                          </View>
                        );
                      }
                      return (
                        <PlayerRoundCell
                          key={`${player.id}-${round.id}`}
                          playerRound={roundPlayer}
                          round={round}
                          updateScore={handleScoreChange}
                        />
                      );
                    })}
                  </TableRow>
                ))}
                <TableRow className="h-16 bg-accent/50">
                  {players.map((player) => {
                    if (data.scoresheet.roundsScore === "Manual") {
                      return (
                        <FooterManualScore
                          key={player.id}
                          player={player}
                          updatePlayerScore={updatePlayerScore}
                        />
                      );
                    }
                    const total = calculateFinalScore(
                      player.rounds.map((round) => ({
                        score: round.score ?? 0,
                      })),
                      data.scoresheet,
                    );
                    return <FooterTotalCell key={player.id} total={total} />;
                  })}
                </TableRow>
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      </SafeAreaView>
      <MatchFooter
        duration={duration}
        isRunning={isRunning}
        isSubmitting={isSubmitting}
        toggleClock={toggleClock}
        resetClock={resetClock}
        onFinish={onFinish}
      />
    </View>
  );
}
const MatchFooter = ({
  duration,
  isRunning,
  isSubmitting,
  toggleClock,
  resetClock,
  onFinish,
}: {
  duration: Match["duration"];
  isRunning: boolean;
  isSubmitting: boolean;
  toggleClock: () => void;
  resetClock: () => void;
  onFinish: () => void;
}) => {
  return (
    <CardFooter className="flex flex-row justify-between px-2 pt-6">
      <View className="flex flex-row items-center justify-center gap-2">
        <Text className="text-center text-2xl font-bold">
          {formatDuration(duration)}
        </Text>
        <Button onPress={toggleClock} size={"icon"} variant={"outline"}>
          {isRunning ? (
            <Pause className="text-foreground" size={20} strokeWidth={2} />
          ) : (
            <Play className="text-foreground" size={20} strokeWidth={2} />
          )}
        </Button>
        <Button onPress={resetClock} size={"icon"} variant={"outline"}>
          <RotateCcw className="text-foreground" size={20} strokeWidth={2} />
        </Button>
      </View>
      <Button
        onPress={onFinish}
        disabled={isSubmitting}
        className="flex flex-row items-center gap-2"
      >
        {isSubmitting ? (
          <>
            <ActivityIndicator className="text-secondary" />
            <Text>Submitting...</Text>
          </>
        ) : (
          <Text>Finish</Text>
        )}
      </Button>
    </CardFooter>
  );
};

const RoundHeaderCell = ({ round }: { round: Round }) => {
  return (
    <TableCell
      className={cn(
        "w-28 items-center justify-center font-semibold text-muted-foreground",
        round.color && "text-slate-600 hover:opacity-50 hover:dark:opacity-80",
      )}
    >
      <Text className="text-center text-sm">{round.name}</Text>
    </TableCell>
  );
};
const PlayerHeaderCell = ({ player }: { player: Match["players"][number] }) => {
  return (
    <TableHead className="flex w-28 min-w-20 flex-1 items-center justify-center text-center">
      <Text className="flex w-20 flex-wrap text-sm">{player.name}</Text>
    </TableHead>
  );
};
const PlayerRoundCell = ({
  playerRound,
  round,
  updateScore,
}: {
  playerRound: Player["rounds"][number];
  round: Round;
  updateScore: (
    PlayerRound: Player["rounds"][number],
    Round: Round,
    newScore: number | null,
  ) => void;
}) => {
  return (
    <TableCell className="flex w-28 min-w-20 flex-1 flex-row items-center justify-center">
      {round.type === "Numeric" ? (
        <TextInput
          value={`${playerRound.score ?? ""}`}
          onChangeText={(text) => {
            const parsed = parseInt(text);
            if (!isNaN(parsed)) {
              updateScore(playerRound, round, parsed);
            } else {
              updateScore(playerRound, round, null);
            }
          }}
          keyboardType="numeric"
          className="min-h-5 w-full min-w-5 border-none bg-transparent text-center outline-none"
          style={{ outline: "none", outlineColor: "transparent" }}
        />
      ) : (
        <Checkbox
          onCheckedChange={(isChecked) => {
            updateScore(playerRound, round, isChecked ? round.score : 0);
          }}
          checked={(playerRound.score ?? 0) === round.score}
        />
      )}
    </TableCell>
  );
};
const TotalCell = () => {
  return (
    <TableCell className="w-28 bg-accent/90 font-bold text-muted-foreground">
      <Text className="text-sm text-foreground">Total</Text>
    </TableCell>
  );
};
const FooterTotalCell = ({ total }: { total: number }) => {
  return (
    <TableCell className="min-w-20 flex-1">
      <View className="flex flex-row items-center justify-center">
        <Text className="text-center text-sm">
          {total === Infinity ? 0 : total === -Infinity ? 0 : total}
        </Text>
      </View>
    </TableCell>
  );
};
const FooterManualScore = ({
  player,
  updatePlayerScore,
}: {
  player: Player;
  updatePlayerScore: (player: Player, score: number | null) => void;
}) => {
  return (
    <TableCell className="min-w-20 flex-1">
      <TextInput
        value={`${player.score ?? ""}`}
        onChangeText={(text: string) => {
          const score = Number(text);
          if (isNaN(score) || text === "") {
            updatePlayerScore(player, null);
          } else {
            updatePlayerScore(player, score);
          }
        }}
        keyboardType="numeric"
        className="min-h-5 min-w-5 text-center"
        style={{ outline: "none", outlineColor: "transparent" }}
      />
    </TableCell>
  );
};
