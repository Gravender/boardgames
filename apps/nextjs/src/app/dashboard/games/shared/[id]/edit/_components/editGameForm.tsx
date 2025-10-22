"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Minus,
  Plus,
  Table,
  Trash,
} from "lucide-react";
import { z } from "zod/v4";

import type { RouterInputs, RouterOutputs } from "@board-games/api";
import type { UseFormReturn } from "@board-games/ui/form";
import {
  scoreSheetRoundsScore,
  scoreSheetWinConditions,
} from "@board-games/db/constants";
import {
  editScoresheetSchemaForm,
  sharedEditGameSchema,
} from "@board-games/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@board-games/ui/alert-dialog";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { Checkbox } from "@board-games/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@board-games/ui/collapsible";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFieldArray,
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
import { toast } from "@board-games/ui/toast";

import { GradientPicker } from "~/components/color-picker";
import { Spinner } from "~/components/spinner";
import { useTRPC } from "~/trpc/react";
import { RoundPopOver } from "./roundPopOver";

const scoresheetsSchema = z
  .array(editScoresheetSchemaForm)
  .min(1)
  .check((ctx) => {
    const numberDefaultScoresheets = ctx.value.filter(
      (scoresheet) => scoresheet.isDefault,
    ).length;
    if (numberDefaultScoresheets > 1) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        message: "Only one default scoresheet is allowed.",
        path: ["isDefault"],
      });
    }
  });

export function EditGameForm({
  data,
}: {
  data: NonNullable<RouterOutputs["sharing"]["getEditSharedGame"]>;
}) {
  const [moreOptions, setMoreOptions] = useState(false);
  const [game, setGame] = useState<
    NonNullable<RouterOutputs["sharing"]["getEditSharedGame"]>["game"]
  >(data.game);
  const [scoresheets, setScoresheets] = useState<
    z.infer<typeof scoresheetsSchema>
  >(
    data.scoresheets.map((scoresheet) => ({
      ...scoresheet,
      permission: scoresheet.permission === "edit" ? "edit" : ("view" as const),
      scoresheetId: scoresheet.id,
      scoreSheetChanged: false,
      roundChanged: false,
    })),
  );
  const [activeScoreSheet, setActiveScoreSheet] = useState(0);
  const [isScoresheet, setIsScoresheet] = useState(false);

  const updateScoreSheets = (
    scoresheet: z.infer<typeof editScoresheetSchemaForm>,
  ) => {
    setScoresheets((prev) => {
      if (prev.length === 0) {
        return [
          {
            ...scoresheet,
            scoresheetId: null,
            scoreSheetChanged: true,
            roundChanged: true,
          },
        ];
      }
      const newScoreSheets = prev.map((prevScoreSheet, index) => {
        if (index === activeScoreSheet) {
          return scoresheet;
        }
        if (scoresheet.isDefault) {
          if (prevScoreSheet.scoresheetType === "new") {
            return {
              ...prevScoreSheet,
              isDefault: false,
            };
          } else {
            return {
              ...prevScoreSheet,
              isDefault: false,
              scoreSheetChanged: prevScoreSheet.isDefault
                ? true
                : prevScoreSheet.scoreSheetChanged,
            };
          }
        }
        return prevScoreSheet;
      });
      if (activeScoreSheet === prev.length) {
        newScoreSheets.push(scoresheet);
        return newScoreSheets;
      }
      return newScoreSheets;
    });
  };

  return (
    <Card className="w-full sm:max-w-2xl">
      <CardHeader>
        <CardTitle>{`Edit ${isScoresheet ? `${scoresheets[activeScoreSheet]?.name ?? `Scoresheet ${scoresheets.length}`} Scoresheet` : data.game.name}`}</CardTitle>
      </CardHeader>
      {isScoresheet ? (
        <ScoresheetForm
          scoresheet={
            scoresheets[activeScoreSheet] ?? {
              scoresheetType: "new",
              id: null,
              name:
                scoresheets.length === 0
                  ? "Default"
                  : `Scoresheet ${scoresheets.length}`,
              winCondition: "Highest Score",
              isCoop: false,
              roundsScore: "Aggregate",
              targetScore: 0,

              rounds: [
                {
                  roundId: null,
                  name: "Round 1",
                  type: "Numeric",
                  color: "#cbd5e1",
                  score: 0,
                  order: 0,
                },
              ],
            }
          }
          setScoresheet={updateScoreSheets}
          setIsScoresheet={setIsScoresheet}
        />
      ) : (
        <GameForm
          data={data}
          game={game}
          scoresheets={scoresheets}
          moreOptions={moreOptions}
          activeScoreSheet={activeScoreSheet}
          setGame={setGame}
          setScoresheets={setScoresheets}
          setActiveScoreSheet={setActiveScoreSheet}
          setIsScoresheet={setIsScoresheet}
          setMoreOptions={setMoreOptions}
        />
      )}
    </Card>
  );
}

const GameForm = ({
  data,
  game,
  scoresheets,
  moreOptions,
  activeScoreSheet,
  setGame,
  setScoresheets,
  setActiveScoreSheet,
  setIsScoresheet,
  setMoreOptions,
}: {
  data: NonNullable<RouterOutputs["sharing"]["getEditSharedGame"]>;
  game: z.infer<typeof sharedEditGameSchema>;
  scoresheets: z.infer<typeof scoresheetsSchema>;
  moreOptions: boolean;
  activeScoreSheet: number;
  setGame: (
    game: NonNullable<RouterOutputs["sharing"]["getEditSharedGame"]>["game"],
  ) => void;
  setScoresheets: (scoresheets: z.infer<typeof scoresheetsSchema>) => void;
  setActiveScoreSheet: (activeScoreSheet: number) => void;
  setIsScoresheet: (isScoresheet: boolean) => void;
  setMoreOptions: (moreOptions: boolean) => void;
}) => {
  const trpc = useTRPC();
  const [openAlert, setOpenAlert] = useState(false);

  const router = useRouter();

  const queryClient = useQueryClient();
  const mutation = useMutation(
    trpc.sharing.updateSharedGame.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.game.getGames.queryOptions());
        await queryClient.invalidateQueries(
          trpc.sharing.getSharedGame.queryOptions({ id: data.game.id }),
        );
        await queryClient.invalidateQueries(
          trpc.sharing.getShareGameStats.queryOptions({ id: data.game.id }),
        );
        await queryClient.invalidateQueries(
          trpc.dashboard.getGames.queryOptions(),
        );
        toast.success("Game updated successfully!");
        form.reset();
        router.push(`/dashboard/games`);
      },
    }),
  );

  const form = useForm({
    schema: sharedEditGameSchema,
    defaultValues: game,
  });

  const updateGame = ({
    values,
  }: {
    values: z.infer<typeof sharedEditGameSchema>;
  }) => {
    const nameChanged = values.name !== data.game.name;
    const playersMinChanged = values.playersMin !== data.game.playersMin;
    const playersMaxChanged = values.playersMax !== data.game.playersMax;
    const playtimeMinChanged = values.playtimeMin !== data.game.playtimeMin;
    const playtimeMaxChanged = values.playtimeMax !== data.game.playtimeMax;
    const yearPublishedChanged =
      values.yearPublished !== data.game.yearPublished;
    const scoresheetChanged = scoresheets.some(
      (scoresheet) =>
        scoresheet.scoresheetType === "new" ||
        scoresheet.scoreSheetChanged ||
        scoresheet.roundChanged,
    );
    const gameChanged =
      nameChanged ||
      playersMinChanged ||
      playersMaxChanged ||
      playtimeMinChanged ||
      playtimeMaxChanged ||
      yearPublishedChanged;

    if (gameChanged || scoresheetChanged) {
      const game = gameChanged
        ? {
            type: "updateGame" as const,
            id: data.game.id,
            name: nameChanged ? values.name : undefined,
            playersMin: playersMinChanged ? values.playersMin : undefined,
            playersMax: playersMaxChanged ? values.playersMax : undefined,
            playtimeMin: playtimeMinChanged ? values.playtimeMin : undefined,
            playtimeMax: playtimeMaxChanged ? values.playtimeMax : undefined,
            yearPublished: yearPublishedChanged
              ? values.yearPublished
              : undefined,
          }
        : { type: "default" as const, id: data.game.id };
      if (scoresheetChanged) {
        const changedScoresheets = scoresheets
          .filter(
            (scoresheet) =>
              scoresheet.scoresheetType === "new" ||
              scoresheet.scoreSheetChanged ||
              scoresheet.roundChanged,
          )
          .map<
            | RouterInputs["sharing"]["updateSharedGame"]["scoresheets"][number]
            | undefined
          >((scoresheet) => {
            const foundScoresheet = data.scoresheets.find(
              (dataScoresheet) =>
                dataScoresheet.id === scoresheet.id &&
                dataScoresheet.scoresheetType === scoresheet.scoresheetType,
            );
            if (!foundScoresheet || scoresheet.scoresheetType === "new") {
              const newScoresheet: Extract<
                RouterInputs["sharing"]["updateSharedGame"]["scoresheets"][number],
                { type: "New" }
              > = {
                type: "New" as const,
                scoresheet: {
                  name: scoresheet.name,
                  winCondition: scoresheet.winCondition,
                  isCoop: scoresheet.isCoop,
                  isDefault: scoresheet.isDefault,
                  roundsScore: scoresheet.roundsScore,
                  targetScore: scoresheet.targetScore,
                },
                rounds: scoresheet.rounds,
              };
              return newScoresheet;
            }
            const scoresheetName =
              scoresheet.name !== foundScoresheet.name
                ? scoresheet.name
                : undefined;
            const scoresheetWinCondition =
              scoresheet.winCondition !== foundScoresheet.winCondition
                ? scoresheet.winCondition
                : undefined;
            const scoresheetIsCoop =
              scoresheet.isCoop !== foundScoresheet.isCoop
                ? scoresheet.isCoop
                : undefined;
            const scoresheetRoundsScore =
              scoresheet.roundsScore !== foundScoresheet.roundsScore
                ? scoresheet.roundsScore
                : undefined;
            const scoresheetTargetScore =
              scoresheet.targetScore !== foundScoresheet.targetScore
                ? scoresheet.targetScore
                : undefined;
            const hasScoresheetChanged =
              scoresheetName !== undefined ||
              scoresheetWinCondition !== undefined ||
              scoresheetIsCoop !== undefined ||
              scoresheetRoundsScore !== undefined ||
              scoresheetTargetScore !== undefined;
            if (scoresheet.roundChanged) {
              type UpdateScoresheetAndRoundsType = Extract<
                RouterInputs["sharing"]["updateSharedGame"]["scoresheets"][number],
                { type: "Update Scoresheet & Rounds" }
              >;
              const changedRounds = scoresheet.rounds
                .map<
                  | UpdateScoresheetAndRoundsType["roundsToEdit"][number]
                  | undefined
                >((round) => {
                  const foundRound = foundScoresheet.rounds.find(
                    (dataRound) => dataRound.roundId === round.roundId,
                  );
                  if (!foundRound) return undefined;
                  const nameChanged =
                    round.name !== foundRound.name ? round.name : undefined;
                  const typeChanged =
                    round.type !== foundRound.type ? round.type : undefined;
                  const scoreChanged =
                    round.score !== foundRound.score ? round.score : undefined;
                  const colorChanged =
                    round.color !== foundRound.color ? round.color : undefined;
                  if (
                    nameChanged ||
                    typeChanged ||
                    scoreChanged ||
                    colorChanged
                  ) {
                    return {
                      id: foundRound.roundId,
                      name: nameChanged ? round.name : undefined,
                      type: typeChanged ? round.type : undefined,
                      score: scoreChanged ? round.score : undefined,
                      color: colorChanged ? round.color : undefined,
                    };
                  }
                  return undefined;
                })
                .filter<UpdateScoresheetAndRoundsType["roundsToEdit"][number]>(
                  (round) => round !== undefined,
                );
              const roundsToDelete = foundScoresheet.rounds
                .map<
                  UpdateScoresheetAndRoundsType["roundsToDelete"][number]
                >((round) => round.roundId)
                .filter(
                  (roundId) =>
                    !scoresheet.rounds.find(
                      (round) => round.roundId === roundId,
                    ),
                );
              const roundsToAdd = scoresheet.rounds
                .map<
                  | UpdateScoresheetAndRoundsType["roundsToAdd"][number]
                  | undefined
                >((round, index) => {
                  const foundRound = foundScoresheet.rounds.find(
                    (dataRound) => dataRound.roundId === round.roundId,
                  );
                  if (foundRound) return undefined;
                  return {
                    name: round.name,
                    type: round.type,
                    score: round.score,
                    color: round.color,
                    scoresheetId: foundScoresheet.id,
                    order:
                      foundScoresheet.rounds.length -
                      roundsToDelete.length +
                      index +
                      1,
                  };
                })
                .filter<UpdateScoresheetAndRoundsType["roundsToAdd"][number]>(
                  (round) => round !== undefined,
                );

              const updateScoresheetAndRounds: UpdateScoresheetAndRoundsType = {
                type: "Update Scoresheet & Rounds" as const,
                scoresheet: hasScoresheetChanged
                  ? {
                      id: foundScoresheet.id,
                      scoresheetType: scoresheet.scoresheetType,
                      name: scoresheet.name,
                      winCondition: scoresheetWinCondition,
                      isCoop: scoresheetIsCoop ?? foundScoresheet.isCoop,

                      isDefault: scoresheet.isDefault,
                      roundsScore: scoresheetRoundsScore,
                      targetScore: scoresheetTargetScore,
                    }
                  : {
                      id: foundScoresheet.id,
                      scoresheetType: scoresheet.scoresheetType,
                    },
                roundsToEdit: changedRounds,
                roundsToAdd: roundsToAdd,
                roundsToDelete: roundsToDelete,
              };
              return updateScoresheetAndRounds;
            }
            if (scoresheet.scoreSheetChanged) {
              return {
                type: "Update Scoresheet" as const,
                scoresheet: {
                  id: foundScoresheet.id,
                  name: scoresheet.name,
                  winCondition: scoresheetWinCondition,
                  isCoop: scoresheetIsCoop ?? foundScoresheet.isCoop,
                  scoresheetType: scoresheet.scoresheetType,
                  isDefault: scoresheet.isDefault,
                  roundsScore: scoresheetRoundsScore,
                  targetScore: scoresheetTargetScore,
                },
              };
            }
          })
          .filter((scoresheet) => scoresheet !== undefined);
        const scoresheetsToDelete = data.scoresheets
          .filter(
            (foundScoresheet) =>
              !scoresheets.find(
                (scoresheet) =>
                  scoresheet.id === foundScoresheet.id &&
                  scoresheet.scoresheetType === foundScoresheet.scoresheetType,
              ),
          )
          .map((foundScoresheet) => ({ id: foundScoresheet.id }));
        mutation.mutate({
          game: game,
          scoresheets: changedScoresheets,
          scoresheetsToDelete: scoresheetsToDelete,
        });
      } else {
        mutation.mutate({
          game: game,
          scoresheets: [],
          scoresheetsToDelete: [],
        });
      }
    }
  };

  function onSubmit(values: z.infer<typeof sharedEditGameSchema>) {
    updateGame({ values });
  }

  return (
    <AlertDialog open={openAlert} onOpenChange={setOpenAlert}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              disabled={data.game.permission === "view"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Game Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Game name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Collapsible open={moreOptions} onOpenChange={setMoreOptions}>
              <CollapsibleTrigger asChild>
                <Button className="pl-0" variant="ghost" size="sm">
                  <span>More options</span>
                  {moreOptions ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label>Players</Label>
                    <FormField
                      control={form.control}
                      name="playersMin"
                      disabled={data.game.permission === "view"}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Min"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? null
                                    : parseInt(e.target.value),
                                )
                              }
                              value={field.value ?? undefined}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="playersMax"
                      disabled={data.game.permission === "view"}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Max"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? null
                                    : parseInt(e.target.value),
                                )
                              }
                              value={field.value ?? undefined}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  {(form.formState.errors.playersMin ??
                    form.formState.errors.playersMax) && (
                    <div className="grid grid-cols-3 items-center gap-4">
                      <div />
                      {form.formState.errors.playersMin !== undefined ? (
                        <FormMessage>
                          {form.formState.errors.playersMin.message}
                        </FormMessage>
                      ) : (
                        <div />
                      )}
                      {form.formState.errors.playersMax !== undefined ? (
                        <FormMessage>
                          {form.formState.errors.playersMax.message}
                        </FormMessage>
                      ) : (
                        <div />
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label>Playtime</Label>
                    <FormField
                      control={form.control}
                      disabled={data.game.permission === "view"}
                      name="playtimeMin"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Min"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? null
                                    : parseInt(e.target.value),
                                )
                              }
                              value={field.value ?? undefined}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      disabled={data.game.permission === "view"}
                      name="playtimeMax"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Max"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? null
                                    : parseInt(e.target.value),
                                )
                              }
                              value={field.value ?? undefined}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  {(form.formState.errors.playtimeMin ??
                    form.formState.errors.playtimeMax) && (
                    <div className="grid grid-cols-3 items-center gap-4">
                      <div />
                      {form.formState.errors.playtimeMin !== undefined ? (
                        <FormMessage>
                          {form.formState.errors.playtimeMin.message}
                        </FormMessage>
                      ) : (
                        <div />
                      )}
                      {form.formState.errors.playtimeMax !== undefined ? (
                        <FormMessage>
                          {form.formState.errors.playtimeMax.message}
                        </FormMessage>
                      ) : (
                        <div />
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label>Year Published</Label>
                    <FormField
                      control={form.control}
                      disabled={data.game.permission === "view"}
                      name="yearPublished"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Year"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? null
                                    : parseInt(e.target.value),
                                )
                              }
                              value={field.value ?? undefined}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div></div>
                  </div>
                  {form.formState.errors.yearPublished && (
                    <div className="grid grid-cols-3 items-center gap-4">
                      <div />
                      {form.formState.errors.yearPublished.message !==
                      undefined ? (
                        <FormMessage>
                          {form.formState.errors.yearPublished.message}
                        </FormMessage>
                      ) : (
                        <div />
                      )}
                      <div />
                    </div>
                  )}
                </div>
                <Separator className="w-full" orientation="horizontal" />
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-semibold">Scoresheet</div>
                    <Button
                      variant="default"
                      disabled={data.game.permission === "view"}
                      onClick={() => {
                        if (data.game.permission === "view") return;
                        const newGame = form.getValues();
                        setGame({
                          name: newGame.name,
                          id: data.game.id,
                          permission: data.game.permission,
                          image: data.game.image,
                          yearPublished: newGame.yearPublished,
                          playersMin: newGame.playersMin,
                          playersMax: newGame.playersMax,
                          playtimeMin: newGame.playtimeMin,
                          playtimeMax: newGame.playtimeMax,
                        });
                        setIsScoresheet(true);
                        setActiveScoreSheet(scoresheets.length);
                      }}
                      type="button"
                    >
                      {"Create New"}
                    </Button>
                  </div>
                  <div>
                    {scoresheets.map((scoreSheet, index) => {
                      return (
                        <div
                          key={`${index}-${scoreSheet.id}`}
                          className="flex items-center justify-between gap-2"
                        >
                          <Table />
                          <button
                            className="flex flex-grow flex-col items-start justify-start"
                            onClick={() => {
                              if (data.game.permission === "edit") {
                                const newGame = form.getValues();
                                setGame({
                                  name: newGame.name,
                                  id: data.game.id,
                                  permission: data.game.permission,
                                  image: data.game.image,
                                  yearPublished: newGame.yearPublished,
                                  playersMin: newGame.playersMin,
                                  playersMax: newGame.playersMax,
                                  playtimeMin: newGame.playtimeMin,
                                  playtimeMax: newGame.playtimeMax,
                                });
                              }
                              setIsScoresheet(true);
                              setActiveScoreSheet(index);
                            }}
                            type="button"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{scoreSheet.name}</span>
                              {scoreSheet.scoresheetType === "shared" && (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-600 text-xs text-white"
                                >
                                  Shared
                                </Badge>
                              )}
                              {scoreSheet.isDefault && <Badge>Default</Badge>}
                            </div>
                            <div className="mb-2 flex w-full items-center gap-3 text-sm">
                              <div className="flex min-w-20 items-center gap-1">
                                <span>Win Condition:</span>
                                <span className="text-muted-foreground text-sm">
                                  {scoreSheet.winCondition ?? "Highest Score"}
                                </span>
                              </div>
                              <Separator
                                orientation="vertical"
                                className="font-semi-bold h-4"
                              />
                              <div className="flex min-w-20 items-center gap-1">
                                <span>Rounds:</span>
                                <span className="text-muted-foreground text-sm">
                                  {scoreSheet.rounds.length > 0
                                    ? scoreSheet.rounds.length
                                    : "1"}
                                </span>
                              </div>
                            </div>
                          </button>

                          <Button
                            variant="destructive"
                            size="icon"
                            type="button"
                            onClick={() => {
                              setActiveScoreSheet(index);
                              setOpenAlert(true);
                            }}
                            disabled={scoresheets.length === 1}
                          >
                            <Trash />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
          <CardFooter className="flex flex-row justify-end gap-2">
            <Button
              type="reset"
              variant="secondary"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Spinner />
                  <span>Uploading...</span>
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The scoresheet will be permanently
            deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              setScoresheets(
                scoresheets.filter((_, i) => i !== activeScoreSheet),
              )
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const ScoresheetForm = ({
  scoresheet,
  setScoresheet,
  setIsScoresheet,
}: {
  scoresheet: z.infer<typeof editScoresheetSchemaForm>;
  setScoresheet: (scoresheet: z.infer<typeof editScoresheetSchemaForm>) => void;
  setIsScoresheet: (isScoresheet: boolean) => void;
}) => {
  const form = useForm({
    schema: editScoresheetSchemaForm,
    defaultValues: scoresheet,
  });
  const onBack = () => {
    setIsScoresheet(false);
  };
  const onSubmit = (data: z.infer<typeof editScoresheetSchemaForm>) => {
    if (data.scoresheetType !== "new") {
      data.scoreSheetChanged = true;
      data.roundChanged = true;
    }
    setScoresheet(data);
    onBack();
  };

  const winConditionOptions = scoreSheetWinConditions;
  const roundsScoreOptions: (typeof scoreSheetRoundsScore)[number][] =
    scoreSheetRoundsScore.filter((option) => option !== "None");

  const manualWinConditionOptions = scoreSheetRoundsScore;
  const coopWinConditionOptions: (typeof scoreSheetWinConditions)[number][] = [
    "Manual",
    "Target Score",
  ];
  const formWinCondition = form.watch("winCondition");
  const formRoundsScore = form.watch("roundsScore");
  const formIsCoop = form.watch("isCoop");

  useEffect(() => {
    if (formWinCondition !== "Manual" && formRoundsScore === "None") {
      form.setValue("roundsScore", "Aggregate");
    }
    if (formIsCoop) {
      if (
        formWinCondition !== "Manual" &&
        formWinCondition !== "Target Score"
      ) {
        form.setValue("winCondition", "Manual");
        form.setValue("roundsScore", "Manual");
      }
    }
  }, [formWinCondition, formRoundsScore, form, formIsCoop]);
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-8 pb-4">
          <FormField
            control={form.control}
            name="name"
            disabled={
              scoresheet.scoresheetType === "shared" &&
              scoresheet.permission === "view"
            }
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sheet Name</FormLabel>
                <FormControl>
                  <Input placeholder="Sheet name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isCoop"
            disabled={
              scoresheet.scoresheetType === "shared" &&
              scoresheet.permission === "view"
            }
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                <FormLabel>Is Co-op?</FormLabel>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={field.disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isDefault"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                <FormLabel>Is Default?</FormLabel>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={field.disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="winCondition"
            disabled={
              scoresheet.scoresheetType === "shared" &&
              scoresheet.permission === "view"
            }
            render={({ field }) => (
              <FormItem>
                <FormLabel>Win Condition</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={field.disabled}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a win condition" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(formIsCoop
                      ? coopWinConditionOptions
                      : winConditionOptions
                    ).map((condition) => (
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
          {formWinCondition === "Target Score" && (
            <FormField
              control={form.control}
              name={`targetScore`}
              disabled={
                scoresheet.scoresheetType === "shared" &&
                scoresheet.permission === "view"
              }
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Score</FormLabel>

                  <FormControl>
                    <Input
                      {...field}
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      type="number"
                      className="text-center"
                      disabled={field.disabled}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="roundsScore"
            disabled={
              scoresheet.scoresheetType === "shared" &&
              scoresheet.permission === "view"
            }
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scoring Method</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={field.disabled}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a win condition" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(formWinCondition === "Manual"
                      ? manualWinConditionOptions
                      : roundsScoreOptions
                    ).map((condition) => (
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

          <Separator className="w-full" orientation="horizontal" />
          <AddRounds
            form={form}
            editable={
              !(
                scoresheet.scoresheetType === "shared" &&
                scoresheet.permission === "view"
              )
            }
          />
        </CardContent>
        <CardFooter className="flex flex-row justify-end gap-2">
          <Button type="reset" variant="secondary" onClick={() => onBack()}>
            Cancel
          </Button>
          <Button type="submit">Submit</Button>
        </CardFooter>
      </form>
    </Form>
  );
};
const AddRounds = ({
  form,

  editable,
}: {
  form: UseFormReturn<z.infer<typeof editScoresheetSchemaForm>>;
  editable: boolean;
}) => {
  const { fields, remove, append } = useFieldArray({
    name: "rounds",
    control: form.control,
  });
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xl font-semibold">Rows</div>
      <div className="flex max-h-64 flex-col gap-2 overflow-auto">
        {fields.map((field, index) => {
          return (
            <div
              key={field.id}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name={`rounds.${index}.color`}
                  disabled={!editable}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="hidden">Round Color</FormLabel>
                      <FormControl>
                        <GradientPicker
                          color={field.value ?? null}
                          setColor={field.onChange}
                          disabled={field.disabled}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`rounds.${index}.name`}
                  disabled={!editable}
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="hidden">Round Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Round name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-center gap-2">
                <RoundPopOver index={index} form={form} disabled={!editable} />
                <Button
                  variant="secondary"
                  size="icon"
                  type="button"
                  disabled={!editable}
                  onClick={() => {
                    const round = form.getValues("rounds")[index];
                    append({
                      ...field,
                      name: `Round ${fields.length + 1}`,
                      type: round?.type,
                      score: round?.score,
                      order: fields.length + 1,
                    });
                  }}
                >
                  <Copy />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  type="button"
                  disabled={!editable}
                  onClick={() => remove(index)}
                >
                  <Trash />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          size={"icon"}
          disabled={!editable}
          onClick={() =>
            append({
              roundId: null,
              name: `Round ${fields.length + 1}`,
              type: "Numeric",
              score: 0,
              order: fields.length + 1,
            })
          }
        >
          <Plus />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size={"icon"}
          disabled={!editable}
          onClick={() => remove(form.getValues("rounds").length - 1)}
        >
          <Minus />
        </Button>
      </div>
    </div>
  );
};
