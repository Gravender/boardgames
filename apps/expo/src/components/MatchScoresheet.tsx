import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
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
import { Input } from "./ui/input";
import {
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
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

  const leftRef = useRef<ScrollView | null>(null);
  const rightRef = useRef<ScrollView | null>(null);

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
      <View style={{ height: "80%", flexDirection: "row" }}>
        <View>
          <TableHeader>
            <TableRow className="h-14 w-28 bg-accent">
              <TableHead className="h-14 w-28">
                <Button size="icon"></Button>
              </TableHead>
            </TableRow>
          </TableHeader>

          <ScrollView
            ref={leftRef}
            scrollEnabled={false}
            style={{ height: "80%" }}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-1">
              <FlashList
                data={data.scoresheet.rounds}
                renderItem={({ item: round }) => (
                  <RoundHeaderCell round={round} />
                )}
                estimatedItemSize={56}
                keyExtractor={(item) => item.id.toString()}
              />
            </View>

            <TableFooter>
              <TableRow>
                <TotalCell />
              </TableRow>
            </TableFooter>
          </ScrollView>
        </View>
        <ScrollView
          bounces={false}
          horizontal={true}
          className="w-full max-w-[100vw]"
          showsHorizontalScrollIndicator={false}
        >
          <View className="w-full">
            <TableHeader>
              <TableRow className="h-14 bg-accent">
                {players.map((player) => (
                  <PlayerHeaderCell
                    player={player}
                    key={`${player.id}-header`}
                  />
                ))}
              </TableRow>
            </TableHeader>

            <ScrollView
              ref={rightRef}
              onScroll={(e) => {
                leftRef.current?.scrollTo({
                  y: e.nativeEvent.contentOffset.y,
                  animated: false,
                });
              }}
              scrollEventThrottle={16}
              style={{ height: "80%" }}
              showsVerticalScrollIndicator={false}
            >
              <View className="flex-1">
                <FlashList
                  data={data.scoresheet.rounds}
                  renderItem={({ item: round }) => (
                    <TableRow className="h-20">
                      {players.map((player) => {
                        const roundPlayer = player.rounds.find(
                          (r) => r.roundId === round.id,
                        );
                        if (roundPlayer === undefined) return null;
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
                  )}
                  estimatedItemSize={80}
                  keyExtractor={(item) => item.id.toString()}
                />
              </View>
              <TableFooter>
                <TableRow
                  className={cn(
                    data.scoresheet.roundsScore === "Manual" ? "h-20" : "h-14",
                  )}
                >
                  <FlashList
                    data={players}
                    renderItem={({ item: player }) => {
                      if (data.scoresheet.roundsScore === "Manual") {
                        return (
                          <FooterManualScore
                            key={`${player.id}-total`}
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
                      return <FooterTotalCell total={total} />;
                    }}
                    estimatedItemSize={
                      data.scoresheet.roundsScore === "Manual" ? 80 : 56
                    }
                    keyExtractor={(item) => item.id.toString()}
                  />
                </TableRow>
              </TableFooter>
            </ScrollView>
          </View>
        </ScrollView>
      </View>
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
        "h-20 w-28 items-center justify-center bg-accent/90 font-semibold text-muted-foreground",
        round.color && "text-slate-600 hover:opacity-50 hover:dark:opacity-80",
      )}
    >
      <Text className="text-center">{round.name}</Text>
    </TableCell>
  );
};
const PlayerHeaderCell = ({ player }: { player: Match["players"][number] }) => {
  return (
    <TableHead className="h-14 min-w-20 flex-1 items-center justify-center text-center">
      <Text className="flex w-20 flex-wrap">{player.name}</Text>
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
    <TableCell className="flex min-w-20 flex-1 flex-row items-center justify-center">
      {round.type === "Numeric" ? (
        <Input
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
          className="min-h-5 min-w-5 border-none bg-transparent text-center outline-none"
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
      <Text className="text-foreground">Total</Text>
    </TableCell>
  );
};
const FooterTotalCell = ({ total }: { total: number }) => {
  return (
    <TableCell className="min-w-20 flex-1">
      <View className="flex flex-row items-center justify-center">
        <Text className="text-center">
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
    <TableCell key={`${player.id}-total`} className="min-w-20 flex-1">
      <Input
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
        className="min-h-5 min-w-5 border-none bg-transparent text-center"
      />
    </TableCell>
  );
};
