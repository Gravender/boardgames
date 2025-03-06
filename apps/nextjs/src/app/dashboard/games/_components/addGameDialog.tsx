"use client";

import type { SubmitHandler, UseFormReturn } from "react-hook-form";
import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { set } from "lodash";
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
  insertRoundSchema,
  insertScoreSheetSchema,
} from "@board-games/db/schema";
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
import { addGameSubmitAction } from "./addGameSubmit";
import { RoundPopOver } from "./roundPopOver";

export function AddGameDialog() {
  const [isOpen, setIsOpen] = useState(false);

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
export const gameSchema = z
  .object({
    name: z.string().min(1, {
      message: "Game name is required",
    }),
    ownedBy: z.boolean(),
    gameImg: z
      .instanceof(File)
      .refine((file) => file.size <= 4000000, `Max image size is 4MB.`)
      .refine(
        (file) => file.type === "image/jpeg" || file.type === "image/png",
        "Only .jpg and .png formats are supported.",
      )
      .nullable(),
    playersMin: z.number().min(1).nullable(),
    playersMax: z.number().positive().nullable(),
    playtimeMin: z.number().min(1).positive().nullable(),
    playtimeMax: z.number().positive().nullable(),
    yearPublished: z
      .number()
      .min(1900)
      .max(new Date().getFullYear())
      .nullable(),
  })
  .superRefine((values, ctx) => {
    if (
      values.playersMin &&
      values.playersMax &&
      values.playersMin > values.playersMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Players min must be less than or equal to players max.",
        path: ["playersMin"],
      });
    }
    if (
      values.playtimeMin &&
      values.playtimeMax &&
      values.playtimeMin > values.playtimeMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Playtime min must be less than or equal to playtime max.",
        path: ["playtimeMin"],
      });
    }
  });
const scoreSheetSchema = insertScoreSheetSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    userId: true,
    type: true,
    gameId: true,
  })
  .required({ name: true });
const roundsSchema = z.array(
  insertRoundSchema
    .omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      scoresheetId: true,
    })
    .required({ name: true }),
);
const scoreSheetWithRoundsSchema = z.object({
  scoresheet: scoreSheetSchema,
  rounds: roundsSchema,
});
const scoreSheetsSchema = z.array(scoreSheetWithRoundsSchema);
function Content({ setIsOpen }: { setIsOpen: (isOpen: boolean) => void }) {
  const [scoreSheets, setScoreSheets] = useState<
    z.infer<typeof scoreSheetsSchema>
  >([]);
  const [activeScoreSheet, setActiveScoreSheet] = useState(0);
  const [game, setGame] = useState<z.infer<typeof gameSchema>>({
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
                  color: "#E2E2E2",
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
  game: z.infer<typeof gameSchema>;
  setGame: (game: z.infer<typeof gameSchema>) => void;
  scoreSheets: z.infer<typeof scoreSheetsSchema>;
  setScoreSheets: (scoreSheets: z.infer<typeof scoreSheetsSchema>) => void;
  setActiveScoreSheet: (activeScoreSheet: number) => void;
  setIsScoresheet: (isScoresheet: boolean) => void;
  setIsOpen: (isOpen: boolean) => void;
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(
    game.gameImg ? URL.createObjectURL(game.gameImg) : null,
  );

  const { toast } = useToast();
  const [pending, startTransaction] = useTransition();
  const form = useForm<z.infer<typeof gameSchema>>({
    resolver: zodResolver(gameSchema),
    defaultValues: game,
  });
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const onSubmitForm: SubmitHandler<z.infer<typeof gameSchema>> = (data) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("ownedBy", JSON.stringify(data.ownedBy));
    formData.append("playersMin", JSON.stringify(data.playersMin));
    formData.append("playersMax", JSON.stringify(data.playersMax));
    formData.append("playtimeMin", JSON.stringify(data.playtimeMin));
    formData.append("playtimeMax", JSON.stringify(data.playtimeMax));
    formData.append("yearPublished", JSON.stringify(data.yearPublished));
    formData.append("gameImg", data.gameImg ?? "null");
    formData.append("scoresheets", JSON.stringify(scoreSheets));
    startTransaction(async () => {
      // call the server action
      const { data: success, errors } = await addGameSubmitAction(formData);
      if (errors) {
        if (errors === "There was a problem uploading your Image.") {
          toast({
            title: "Error",
            description: "There was a problem uploading your Image.",
            variant: "destructive",
          });
        } else {
          console.error(errors);
        }
      }
      if (success) {
        setImagePreview(null);
        form.reset();
        setIsOpen(false);
        toast({
          title: "Game created successfully!",
          description: "Your data has been uploaded.",
        });
      }
    });
  };
  return (
    <Form {...form}>
      <form className="space-y-8" onSubmit={form.handleSubmit(onSubmitForm)}>
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
                          value={field.value ?? undefined}
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
                          {scoreSheet.scoresheet?.name ?? "Default"}
                        </span>
                        <div className="mb-2 flex w-full items-center gap-3 text-sm">
                          <div className="flex min-w-20 items-center gap-1">
                            <span>Win Condition:</span>
                            <span className="text-sm text-muted-foreground">
                              {scoreSheet.scoresheet?.winCondition ??
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
          <Button type="submit" disabled={pending}>
            {pending ? (
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
export const scoreSheetWithRoundsFormSchema = z.object({
  scoresheet: scoreSheetSchema,
  rounds: roundsSchema,
});
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
  const form = useForm<z.infer<typeof scoreSheetWithRoundsFormSchema>>({
    resolver: zodResolver(scoreSheetWithRoundsFormSchema),
    defaultValues: {
      scoresheet: scoreSheetWithRounds.scoresheet,
      rounds: scoreSheetWithRounds.rounds,
    },
  });
  const onBack = () => {
    setIsScoresheet(false);
  };
  const onSubmit = (data: z.infer<typeof scoreSheetWithRoundsFormSchema>) => {
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
                    {conditions.map((condition) => (
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
  form: UseFormReturn<z.infer<typeof scoreSheetWithRoundsFormSchema>>;
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
