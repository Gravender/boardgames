"use client";

import type { UseFormReturn } from "react-hook-form";
import { useEffect, useState } from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Dices,
  Minus,
  Plus,
  Table,
  Trash,
} from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import {
  baseRoundSchema,
  createGameSchema,
  scoreSheetSchema,
} from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import { CardContent } from "@board-games/ui/card";
import { Checkbox } from "@board-games/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@board-games/ui/collapsible";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@board-games/ui/form";
import { useToast } from "@board-games/ui/hooks/use-toast";
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

import { GradientPicker } from "~/components/color-picker";
import { Spinner } from "~/components/spinner";
import { useTRPC } from "~/trpc/react";
import { useUploadThing } from "~/utils/uploadthing";
import { RoundPopOver } from "./roundPopOver";

export function AddGameDialog({
  defaultIsOpen = false,
}: {
  defaultIsOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultIsOpen);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <Content setIsOpen={setIsOpen} />
      </DialogContent>
      <div className="flex h-full w-full flex-col justify-end">
        <div className="flex justify-end p-4">
          <Button
            variant="default"
            className="rounded-full"
            size="icon"
            onClick={() => setIsOpen(true)}
          >
            <Plus />
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
export const scoreSheetWithRoundsSchema = z.object({
  scoresheet: scoreSheetSchema,
  rounds: z.array(baseRoundSchema),
});
const scoreSheetsSchema = z.array(scoreSheetWithRoundsSchema);
function Content({ setIsOpen }: { setIsOpen: (isOpen: boolean) => void }) {
  const [scoreSheets, setScoreSheets] = useState<
    z.infer<typeof scoreSheetsSchema>
  >([]);
  const [activeScoreSheet, setActiveScoreSheet] = useState(0);
  const [game, setGame] = useState<z.infer<typeof createGameSchema>>({
    name: "",
    ownedBy: false,
    gameImg: null,
    playersMin: null,
    playersMax: null,
    playtimeMin: null,
    playtimeMax: null,
    yearPublished: null,
  });
  const [moreOptions, setMoreOptions] = useState(false);
  const [isScoresheet, setIsScoresheet] = useState(false);

  const updateScoreSheets = (
    scoreSheetWithRounds: z.infer<typeof scoreSheetWithRoundsSchema>,
  ) => {
    setScoreSheets((prev) => {
      if (prev.length === 0) {
        return [scoreSheetWithRounds];
      }
      const newScoreSheets = [...prev];
      if (activeScoreSheet === prev.length) {
        newScoreSheets.push(scoreSheetWithRounds);
        return newScoreSheets;
      }
      newScoreSheets[activeScoreSheet] = scoreSheetWithRounds;
      return newScoreSheets;
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isScoresheet ? "Add Scoresheet" : "Add Game"}
        </DialogTitle>
      </DialogHeader>
      {isScoresheet ? (
        <AddScoreSheetForm
          scoreSheetWithRounds={
            scoreSheets[activeScoreSheet] ?? {
              scoresheet: {
                name:
                  scoreSheets.length === 0
                    ? "Default"
                    : `Scoresheet ${scoreSheets.length}`,
                winCondition: "Highest Score",
                isCoop: false,
                roundsScore: "Aggregate",
                targetScore: 0,
              },
              rounds: [
                {
                  name: "Round 1",
                  type: "Numeric",
                  color: "#cbd5e1",
                  score: 0,
                  order: 0,
                },
              ],
            }
          }
          setScoreSheetWithRounds={updateScoreSheets}
          setIsScoresheet={setIsScoresheet}
        />
      ) : (
        <AddGameForm
          game={game}
          setGame={setGame}
          moreOptions={moreOptions}
          setMoreOptions={setMoreOptions}
          scoreSheets={scoreSheets}
          setScoreSheets={setScoreSheets}
          setActiveScoreSheet={setActiveScoreSheet}
          setIsOpen={setIsOpen}
          setIsScoresheet={setIsScoresheet}
        />
      )}
    </>
  );
}

const AddGameForm = ({
  game,
  setGame,
  moreOptions,
  setMoreOptions,
  scoreSheets,
  setScoreSheets,
  setActiveScoreSheet,
  setIsScoresheet,
  setIsOpen,
}: {
  moreOptions: boolean;
  setMoreOptions: (moreOptions: boolean) => void;
  game: z.infer<typeof createGameSchema>;
  setGame: (game: z.infer<typeof createGameSchema>) => void;
  scoreSheets: z.infer<typeof scoreSheetsSchema>;
  setScoreSheets: (scoreSheets: z.infer<typeof scoreSheetsSchema>) => void;
  setActiveScoreSheet: (activeScoreSheet: number) => void;
  setIsScoresheet: (isScoresheet: boolean) => void;
  setIsOpen: (isOpen: boolean) => void;
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(
    game.gameImg ? URL.createObjectURL(game.gameImg) : null,
  );
  const [isUploading, setIsUploading] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const addGame = useMutation(
    trpc.game.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.game.getGames.queryOptions());
        await queryClient.invalidateQueries(
          trpc.dashboard.getGames.queryOptions(),
        );
        await queryClient.invalidateQueries(
          trpc.dashboard.getUniqueGames.queryOptions(),
        );
        setImagePreview(null);
        form.reset();
        setIsUploading(false);
        setIsOpen(false);
        toast({
          title: "Game created successfully!",
          description: "Your data has been uploaded.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "There was a problem adding your game.",
          variant: "destructive",
        });
      },
    }),
  );

  const { startUpload } = useUploadThing("imageUploader");

  const { toast } = useToast();

  const form = useForm<z.infer<typeof createGameSchema>>({
    resolver: zodResolver(createGameSchema),
    defaultValues: game,
  });
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const onSubmit = async (values: z.infer<typeof createGameSchema>) => {
    setIsUploading(true);
    if (!values.gameImg) {
      addGame.mutate({
        game: {
          name: values.name,
          ownedBy: values.ownedBy,
          playersMin: values.playersMin,
          playersMax: values.playersMax,
          playtimeMin: values.playtimeMin,
          playtimeMax: values.playtimeMax,
          yearPublished: values.yearPublished,
          imageId: null,
        },
        scoresheets: scoreSheets,
      });
    } else {
      try {
        const imageFile = values.gameImg;

        const uploadResult = await startUpload([imageFile]);

        if (!uploadResult) {
          toast({
            title: "Error",
            description: "There was a problem uploading your Image.",
            variant: "destructive",
          });
          throw new Error("Image upload failed");
        }
        const imageId = uploadResult[0]
          ? uploadResult[0].serverData.imageId
          : null;

        addGame.mutate({
          game: {
            name: values.name,
            ownedBy: values.ownedBy,
            playersMin: values.playersMin,
            playersMax: values.playersMax,
            playtimeMin: values.playtimeMin,
            playtimeMax: values.playtimeMax,
            yearPublished: values.yearPublished,
            imageId: imageId,
          },
          scoresheets: scoreSheets,
        });
      } catch (error) {
        console.error("Error uploading Image:", error);

        toast({
          title: "Error",

          description: "There was a problem uploading your Image.",

          variant: "destructive",
        });
      }
    }
  };
  return (
    <Form {...form}>
      <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
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

        <FormField
          control={form.control}
          name="gameImg"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image</FormLabel>
              <FormControl>
                <div className="flex items-center space-x-4">
                  <div className="relative flex h-14 w-14 shrink-0 overflow-hidden rounded-full sm:h-20 sm:w-20">
                    {imagePreview ? (
                      <Image
                        src={imagePreview}
                        alt="Game image"
                        className="aspect-square h-full w-full rounded-sm object-cover"
                        fill
                      />
                    ) : (
                      <Dices className="h-full w-full items-center justify-center rounded-full bg-muted p-2" />
                    )}
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      field.onChange(file);
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setImagePreview(url);
                      }
                    }}
                  />
                </div>
              </FormControl>
              <FormDescription>Upload an image (max 5MB).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ownedBy"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormLabel>Owned by</FormLabel>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
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
                          value={field.value ?? ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="playersMax"
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
                          value={field.value ?? ""}
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
                          value={field.value ?? ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
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
                          value={field.value ?? ""}
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
                  name="yearPublished"
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
                          value={field.value ?? ""}
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
                  {form.formState.errors.yearPublished.message !== undefined ? (
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
            <div className="flex flex-col">
              <div className="flex items-center justify-between">
                <div className="text-xl font-semibold">Scoresheet</div>
                <Button
                  variant="default"
                  onClick={() => {
                    setGame(form.getValues());
                    setIsScoresheet(true);
                    setActiveScoreSheet(scoreSheets.length);
                  }}
                  type="button"
                >
                  {"Create New"}
                </Button>
              </div>
              <div>
                {scoreSheets.map((scoreSheet, index) => {
                  return (
                    <div
                      key={`${index}-${scoreSheet.scoresheet.name}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <Table />
                      <button
                        className="flex flex-grow flex-col items-start justify-start"
                        onClick={() => {
                          setGame(form.getValues());
                          setIsScoresheet(true);
                          setActiveScoreSheet(index);
                        }}
                        type="button"
                      >
                        <span className="text-lg">
                          {scoreSheet.scoresheet.name}
                        </span>
                        <div className="mb-2 flex w-full items-center gap-3 text-sm">
                          <div className="flex min-w-20 items-center gap-1">
                            <span>Win Condition:</span>
                            <span className="text-sm text-muted-foreground">
                              {scoreSheet.scoresheet.winCondition ??
                                "Highest Score"}
                            </span>
                          </div>
                          <Separator
                            orientation="vertical"
                            className="font-semi-bold h-4"
                          />
                          <div className="flex min-w-20 items-center gap-1">
                            <span>Rounds:</span>
                            <span className="text-sm text-muted-foreground">
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
                        onClick={() =>
                          setScoreSheets(
                            scoreSheets.filter((_, i) => i !== index),
                          )
                        }
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
        <DialogFooter className="gap-2">
          <Button
            type="reset"
            variant="secondary"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isUploading}>
            {isUploading ? (
              <>
                <Spinner />
                <span>Uploading...</span>
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
const AddScoreSheetForm = ({
  scoreSheetWithRounds,
  setScoreSheetWithRounds,
  setIsScoresheet,
}: {
  scoreSheetWithRounds: z.infer<typeof scoreSheetWithRoundsSchema>;
  setScoreSheetWithRounds: (
    scoreSheetWithRounds: z.infer<typeof scoreSheetWithRoundsSchema>,
  ) => void;
  setIsScoresheet: (isScoresheet: boolean) => void;
}) => {
  const form = useForm<z.infer<typeof scoreSheetWithRoundsSchema>>({
    resolver: zodResolver(
      scoreSheetWithRoundsSchema.superRefine((data, ctx) => {
        if (data.scoresheet.isCoop) {
          if (
            data.scoresheet.winCondition !== "Manual" &&
            data.scoresheet.winCondition !== "Target Score"
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "Win condition must be Manual or Target Score for Coop games.",
              path: ["scoresheet.winCondition"],
            });
          }
        }
      }),
    ),
    defaultValues: {
      scoresheet: scoreSheetWithRounds.scoresheet,
      rounds: scoreSheetWithRounds.rounds,
    },
  });
  const onBack = () => {
    setIsScoresheet(false);
  };
  const onSubmit = (data: z.infer<typeof scoreSheetWithRoundsSchema>) => {
    setScoreSheetWithRounds({
      scoresheet: data.scoresheet,
      rounds: data.rounds,
    });
    onBack();
  };

  const conditions = scoreSheetSchema.required().pick({ winCondition: true })
    .shape.winCondition.options;
  const roundsScoreOptions = scoreSheetSchema
    .required()
    .pick({ roundsScore: true }).shape.roundsScore.options;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="scoresheet.name"
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
            name="scoresheet.isCoop"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-2 space-x-3 space-y-0">
                <FormLabel>Is Co-op?</FormLabel>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="scoresheet.winCondition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Win Condition</FormLabel>
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
                    {form.getValues("scoresheet.isCoop")
                      ? conditions
                          .filter(
                            (condition) =>
                              condition === "Manual" ||
                              condition === "Target Score",
                          )
                          .map((condition) => (
                            <SelectItem key={condition} value={condition}>
                              {condition}
                            </SelectItem>
                          ))
                      : conditions.map((condition) => (
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
          {form.getValues("scoresheet.winCondition") === "Target Score" && (
            <FormField
              control={form.control}
              name={`scoresheet.targetScore`}
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
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="scoresheet.roundsScore"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scoring Method</FormLabel>
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
                    {roundsScoreOptions.map((condition) => (
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
          <AddRounds form={form} />
        </CardContent>
        <DialogFooter className="gap-2">
          <Button type="reset" variant="secondary" onClick={() => onBack()}>
            Cancel
          </Button>
          <Button type="submit">Submit</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
const AddRounds = ({
  form,
}: {
  form: UseFormReturn<z.infer<typeof scoreSheetWithRoundsSchema>>;
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
                  name={`rounds.${index}.name`}
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
                <RoundPopOver index={index} form={form} />
                <Button
                  variant="secondary"
                  size="icon"
                  type="button"
                  onClick={() => {
                    const round = form.getValues("rounds")[index];
                    append({
                      name: `Round ${fields.length + 1}`,
                      color: round?.color,
                      type: round?.type,
                      score: round?.score,
                      modifier: round?.modifier,
                      lookup: round?.lookup,
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
          onClick={() =>
            append({
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
          onClick={() => remove(form.getValues("rounds").length - 1)}
        >
          <Minus />
        </Button>
      </div>
    </div>
  );
};
