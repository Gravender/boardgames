"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ListPlus, Pause, Play, RotateCcw } from "lucide-react";
import { useForm } from "react-hook-form";
import { type z } from "zod";

import { GradientPicker } from "~/components/color-picker";
import { NumberInput } from "~/components/number-input";
import { Spinner } from "~/components/spinner";
import { Button } from "~/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useDebouncedUpdateMatchData } from "~/hooks/use-debounced-update-match";
import { calculateFinalScore, calculateWinners } from "~/lib/calcluateResults";
import { cn, formatDuration } from "~/lib/utils";
import { insertRoundSchema } from "~/server/db/schema/round";
import { api, type RouterOutputs } from "~/trpc/react";

type Match = NonNullable<RouterOutputs["match"]["getMatch"]>;
export function Match({ match }: { match: Match }) {
  const [players, setPlayers] = useState(() => [...match.players]);
  const [hasPlayersChanged, setHasPlayersChanged] = useState(false);

  const [duration, setDuration] = useState(match.duration);
  const [isRunning, setIsRunning] = useState(match.running);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const utils = api.useUtils();
  const updateMatch = api.match.updateMatch.useMutation({
    onSuccess: async () => {
      await utils.match.getMatch.invalidate({ id: match.id });
      await utils.game.getGame.invalidate({ id: match.gameId });

      router.push(`/dashboard/games/${match.gameId}/${match.id}/summary`);
      setIsSubmitting(false);
    },
  });
  const updateMatchDuration = api.match.updateMatchDuration.useMutation();
  const { debouncedUpdate, isUpdating } = useDebouncedUpdateMatchData(match.id);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveMatch = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (hasPlayersChanged) {
        debouncedUpdate(players, duration, isRunning);
        setHasPlayersChanged(false);
      }
    }, 500);
  }, [players, duration, isRunning, debouncedUpdate, hasPlayersChanged]);
  useEffect(() => {
    if (hasPlayersChanged) {
      saveMatch();
    }
  }, [players, saveMatch, hasPlayersChanged]);
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
    const winners = calculateWinners(
      players.map((player) => ({
        id: player.id,
        rounds: player.rounds.map((round) => ({
          score: round.score ?? 0,
        })),
      })),
      match.scoresheet,
    );
    const matchPlayers = players.map((player) => {
      return {
        id: player.id,
        score: calculateFinalScore(
          player.rounds.map((round) => ({
            score: round.score ?? 0,
          })),
          match.scoresheet,
        ),
        winner: winners.find((winner) => winner.id === player.id) !== undefined,
      };
    });
    updateMatch.mutate({
      match: {
        id: match.id,
        duration: duration,
        finished: true,
        running: false,
      },
      roundPlayers: submittedPlayers,
      matchPlayers: matchPlayers,
    });
  };
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
    if (isRunning && duration % 30 === 0 && match.duration !== duration) {
      const debounce = setTimeout(() => {
        updateMatchDuration.mutate({
          match: { id: match.id },
          duration: duration,
        });
      }, 1000); // Debounce duration
      return () => clearTimeout(debounce);
    }
  }, [isRunning, duration, match, updateMatchDuration]);

  const toggleClock = () => {
    setIsRunning(!isRunning);
    setHasPlayersChanged(true);
    saveMatch();
  };

  const resetClock = () => {
    setDuration(0);
  };

  const handleScoreChange = (
    playerIndex: number,
    roundIndex: number,
    value: number | null,
  ) => {
    const temp = [...players];
    temp[playerIndex]!.rounds[roundIndex]!.score = value ?? null;
    setPlayers(temp);

    setHasPlayersChanged(true);
  };

  return (
    <div className="sm:px-4">
      <CardHeader>
        <CardTitle>{`${match.name}`}</CardTitle>
      </CardHeader>
      <Card>
        <Table containerClassname="max-h-[65vh] h-fit w-screen sm:w-auto rounded-lg">
          <>
            <TableHeader className="sticky top-0 bg-sidebar text-card-foreground shadow-lg z-20">
              <TableRow>
                <TableHead
                  scope="col"
                  className="sm:w-36 w-20 sticky top-0 left-0 bg-sidebar"
                >
                  <div>
                    <AddRoundDialog match={match} />
                  </div>
                </TableHead>
                {players.map((player) => (
                  <TableHead
                    className="text-center min-w-20"
                    scope="col"
                    key={player.id}
                  >
                    {player.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {match.scoresheet.rounds.map((round, index) => (
                <TableRow key={`round-${round.id}`}>
                  <TableHead
                    scope="row"
                    className={cn(
                      "sm:text-lg font-semibold text-muted-foreground sticky left-0 bg-card after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border z-10",
                      round.color &&
                        "text-slate-600 hover:opacity-50 hover:dark:opacity-80",
                    )}
                    style={{
                      backgroundColor: round.color ?? "",
                    }}
                  >
                    {round.name}
                  </TableHead>
                  {players.map((player, playerIndex) => {
                    const roundPlayer = player.rounds[index];
                    return (
                      <TableCell
                        key={`player-${player.id}-round-${round.id}`}
                        className="p-0"
                      >
                        <div className="flex items-center justify-center h-full min-h-[40px] w-full p-1">
                          {round.type === "Numeric" ? (
                            <NumberInput
                              value={roundPlayer?.score ?? 0}
                              onValueChange={(value) => {
                                handleScoreChange(playerIndex, index, value);
                              }}
                              className="text-center border-none"
                            />
                          ) : (
                            <>
                              <Label className="hidden">{`Checkbox to toggle score: ${round.score}`}</Label>
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
                            </>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableHead
                  scope="row"
                  className="sm:text-lg font-semibold text-muted-foreground sticky left-0 bg-muted/50 after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border"
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
                          value={player?.score ?? 0}
                          onChange={(e) => {
                            const score = Number(e.target.value);
                            const temp = [...players];
                            temp[index]!.score = score;
                            setPlayers(temp);
                            setHasPlayersChanged(true);
                          }}
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
                          {total === Infinity
                            ? 0
                            : total === -Infinity
                              ? 0
                              : total}
                        </span>
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableFooter>
          </>
        </Table>
      </Card>
      <CardFooter className="flex justify-between pt-6 px-2">
        <div className="flex items-center justify-center gap-2">
          <div className="text-2xl font-bold text-center">
            {formatDuration(duration)}
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
          disabled={isSubmitting || isUpdating}
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
      </CardFooter>
    </div>
  );
}

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
  const utils = api.useUtils();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof RoundSchema>>({
    resolver: zodResolver(RoundSchema),
    defaultValues: {
      name: `Round ${(match.players[0]?.rounds.length ?? 0) + 1}`,
      type: "Numeric",
      color: "#E2E2E2",
      score: 0,
    },
  });

  const addRound = api.round.addRound.useMutation({
    onSuccess: async () => {
      setIsSubmitting(false);
      await utils.match.getMatch.invalidate({ id: match.id });
      router.refresh();
      setOpen(false);
      form.reset();
    },
  });
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

  const roundsTypeOptions = insertRoundSchema.required().pick({ type: true })
    .shape.type.options;
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Round</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-8">
          <div className="flex gap-2 items-center w- full">
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
                <FormItem className="space-y-0 flex flex-grow">
                  <FormLabel className="hidden">Round Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Round name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex gap-4 items-center w-ull">
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
