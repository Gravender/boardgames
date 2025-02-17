import React, { useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { z } from "zod";

import { calculateFinalScore, formatDuration } from "@board-games/shared";

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
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Text } from "./ui/text";

type Match = NonNullable<RouterOutputs["match"]["getMatch"]>;
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
  const [players, setPlayers] = useState(() => [...data.players]);
  const [manualWinners, setManualWinners] = useState<
    z.infer<typeof ManualWinnerPlayerSchema>
  >([]);
  const [openManualWinnerDialog, setOpenManualWinnerDialog] = useState(false);
  const [hasPlayersChanged, setHasPlayersChanged] = useState(false);

  const [duration, setDuration] = useState(data.duration);
  const [isRunning, setIsRunning] = useState(data.running);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = api.useUtils();
  const router = useRouter();

  const toggleClock = () => {
    setIsRunning(!isRunning);
    setHasPlayersChanged(true);
  };

  const resetClock = () => {
    setDuration(0);
  };

  const handleScoreChange = (
    playerIndex: number,
    roundIndex: number,
    value: number | string | null,
  ) => {
    let newScore: number | null = null;
    if (typeof value === "string") {
      if (value === "") {
        newScore = null;
      } else {
        newScore = parseInt(value);
      }
    } else {
      newScore = value;
    }
    const temp = [...players];
    if (temp[playerIndex]?.rounds?.[roundIndex]?.score !== undefined) {
      temp[playerIndex].rounds[roundIndex].score = newScore;
    }
    setPlayers(temp);

    setHasPlayersChanged(true);
  };

  return (
    <View
      className="flex flex-col gap-2"
      style={{ width: "100%", height: "100%" }}
    >
      <ScrollView bounces={false} style={{ width: "100%", height: "90%" }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 top-0 w-20">
                <Button></Button>
              </TableHead>
              {players.map((player) => (
                <TableHead className="w-20 text-center" key={player.id}>
                  <Text>{player.name}</Text>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <FlashList
              data={data.scoresheet.rounds}
              estimatedItemSize={10}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: round, index }) => {
                return (
                  <TableRow
                    key={round.id}
                    className={cn(
                      "active:bg-secondary",
                      index % 2 && "min-h-10 bg-muted/40",
                    )}
                  >
                    <TableCell
                      className={cn(
                        "sticky left-0 z-10 w-24 border-r-2 bg-card font-semibold text-muted-foreground",
                        round.color &&
                          "text-slate-600 hover:opacity-50 hover:dark:opacity-80",
                      )}
                    >
                      <Text className="items-center">{round.name}</Text>
                    </TableCell>
                    {players.map((player, playerIndex) => {
                      const roundPlayer = player.rounds[index];
                      return (
                        <TableCell
                          key={`player-${player.id}-round-${round.id}`}
                        >
                          <View className="flex w-20 flex-row items-center justify-center p-1">
                            {round.type === "Numeric" ? (
                              <Input
                                value={`${roundPlayer?.score ?? ""}`}
                                onChangeText={(text) =>
                                  handleScoreChange(playerIndex, index, text)
                                }
                                keyboardType="numeric"
                                className="border-none text-center"
                              />
                            ) : (
                              <Checkbox
                                onCheckedChange={(isChecked) => {
                                  handleScoreChange(
                                    playerIndex,
                                    index,
                                    isChecked ? round.score : 0,
                                  );
                                }}
                                checked={
                                  (roundPlayer?.score ?? 0) === round.score
                                }
                              />
                            )}
                          </View>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              }}
              ListFooterComponent={() => {
                return (
                  <TableFooter>
                    <TableRow>
                      <TableCell className="sticky left-0 w-24 border-r-2 bg-muted font-bold text-muted-foreground">
                        <Text className="text-foreground">Total</Text>
                      </TableCell>
                      {players.map((player, index) => {
                        if (data.scoresheet.roundsScore === "Manual") {
                          return (
                            <TableCell
                              key={`${player.id}-total`}
                              className="w-20"
                            >
                              <Input
                                value={`${player.score ?? 0}`}
                                onChange={(text: string) => {
                                  const score =
                                    text === "" ? null : Number(text);

                                  const temp = [...players];
                                  if (temp[index]?.score !== undefined) {
                                    temp[index].score = score;
                                  }
                                  setPlayers(temp);
                                  setHasPlayersChanged(true);
                                }}
                                keyboardType="numeric"
                                className="border-none text-center"
                              />
                            </TableCell>
                          );
                        }
                        const total = calculateFinalScore(
                          player.rounds.map((round) => ({
                            score: round.score ?? 0,
                          })),
                          data.scoresheet,
                        );
                        return (
                          <TableCell
                            key={`${player.id}-total`}
                            className="w-20"
                          >
                            <View className="flex flex-row items-center justify-center">
                              <Text className="text-center">
                                {total === Infinity
                                  ? 0
                                  : total === -Infinity
                                    ? 0
                                    : total}
                              </Text>
                            </View>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableFooter>
                );
              }}
            />
          </TableBody>
        </Table>
      </ScrollView>
      <CardFooter className="flex flex-row justify-between px-2 pt-6">
        <View className="flex flex-row items-center justify-center gap-2">
          <Text className="text-center text-2xl font-bold">
            {formatDuration(duration)}
          </Text>
          <Button onPress={toggleClock} size={"icon"} variant={"outline"}>
            {isRunning ? (
              <Pause size={40} strokeWidth={1.5} />
            ) : (
              <Play size={40} strokeWidth={1.5} />
            )}
          </Button>
          <Button onPress={resetClock} size={"icon"} variant={"outline"}>
            <RotateCcw size={40} strokeWidth={1.5} />
          </Button>
        </View>
        <Button
          onPress={() => {
            setIsSubmitting(!isSubmitting);
          }}
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
    </View>
  );
}
