"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronUp, Dices, Table } from "lucide-react";
import { useForm } from "react-hook-form";
import { type z } from "zod";

import { Spinner } from "~/components/spinner";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { useToast } from "~/hooks/use-toast";
import { useEditGameStore } from "~/providers/edit-game-provider";
import { editGameSchema } from "~/stores/edit-game-store";
import { api, type RouterOutputs } from "~/trpc/react";
import { useUploadThing } from "~/utils/uploadthing";

const formSchema = editGameSchema;

export function EditGameForm({
  data,
}: {
  data: NonNullable<RouterOutputs["game"]["getEditGame"]>;
}) {
  const {
    gameId,
    moreOptions,
    game,
    scoresheet,
    rounds,
    scoresheetChanged,
    setScoresheetChanged,
    setGameId,
    setGame,
    setMoreOptions,
    setRounds,
    setScoreSheet,
    reset,
  } = useEditGameStore((state) => state);
  const tempGameImg = game ? game.gameImg : data.imageUrl;
  const [imagePreview, setImagePreview] = useState<string | null>(
    tempGameImg instanceof File
      ? URL.createObjectURL(tempGameImg)
      : (tempGameImg ?? null),
  );
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { startUpload } = useUploadThing("imageUploader");
  const router = useRouter();

  const utils = api.useUtils();
  const mutation = api.game.updateGame.useMutation({
    onSuccess: async () => {
      await utils.game.getGames.invalidate();
      reset();
      toast({
        title: "Game updated successfully!",
      });
      form.reset();
      setImagePreview(null);
      router.push(`/dashboard/games`);
    },
  });

  const updateGame = ({
    imageId,
    values,
  }: {
    imageId: number | null | undefined;
    values: z.infer<typeof formSchema>;
  }) => {
    const nameChanged = values.name !== data.name;
    const ownedByChanged = values.ownedBy !== data.ownedBy;
    const playersMinChanged = values.playersMin !== data.playersMin;
    const playersMaxChanged = values.playersMax !== data.playersMax;
    const playtimeMinChanged = values.playtimeMin !== data.playtimeMin;
    const playtimeMaxChanged = values.playtimeMax !== data.playtimeMax;
    const yearPublishedChanged = values.yearPublished !== data.yearPublished;
    const imageIdChanged = imageId !== undefined;

    if (
      nameChanged ||
      ownedByChanged ||
      playersMinChanged ||
      playersMaxChanged ||
      playtimeMinChanged ||
      playtimeMaxChanged ||
      yearPublishedChanged ||
      imageIdChanged ||
      scoresheetChanged
    ) {
      const game = {
        id: data.id,

        name: nameChanged ? values.name : undefined,
        ownedBy: ownedByChanged ? values.ownedBy : undefined,
        playersMin: playersMinChanged ? values.playersMin : undefined,
        playersMax: playersMaxChanged ? values.playersMax : undefined,
        playtimeMin: playtimeMinChanged ? values.playtimeMin : undefined,
        playtimeMax: playtimeMaxChanged ? values.playtimeMax : undefined,
        yearPublished: yearPublishedChanged ? values.yearPublished : undefined,
        imageId: imageId,
      };
      if (scoresheetChanged) {
        const changedScoresheet = scoresheet
          ? {
              name:
                scoresheet.name !== data.scoresheet.name
                  ? scoresheet.name
                  : undefined,
              winCondition:
                scoresheet.winCondition !== data.scoresheet.winCondition
                  ? scoresheet.winCondition
                  : undefined,
              isCoop:
                scoresheet.isCoop !== data.scoresheet.isCoop
                  ? scoresheet.isCoop
                  : undefined,
              roundsScore:
                scoresheet.roundsScore !== data.scoresheet.roundsScore
                  ? scoresheet.roundsScore
                  : undefined,
              targetScore:
                scoresheet.targetScore !== data.scoresheet.targetScore
                  ? scoresheet.targetScore
                  : undefined,
            }
          : null;
        const changedRounds = rounds
          ? rounds
              .map((round) => {
                const foundRound = data.rounds.find(
                  (dataRound) => dataRound.id === round.id,
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
                    id: round.id,
                    name: nameChanged ? round.name : undefined,
                    type: typeChanged ? round.type : undefined,
                    score: scoreChanged ? round.score : undefined,
                    color: colorChanged ? round.color : undefined,
                  };
                }
                return undefined;
              })
              .filter((round) => round !== undefined)
          : null;

        const roundsToDelete = data.rounds
          .map((round) => round.id)
          .filter((id) => !rounds.find((round) => round.id === id));
        const roundsToAdd = rounds
          ? rounds
              .map((round, index) => {
                const foundRound = data.rounds.find(
                  (dataRound) => dataRound.id === round.id,
                );
                if (foundRound) return undefined;
                return {
                  name: round.name,
                  type: round.type,
                  score: round.score,
                  color: round.color,
                  scoresheetId: data.scoresheet.id,
                  order: data.rounds.length - roundsToDelete.length + index + 1,
                };
              })
              .filter((round) => round !== undefined)
          : null;

        mutation.mutate({
          game: game,
          scoresheet: changedScoresheet
            ? {
                id: data.scoresheet.id,
                name: changedScoresheet.name,
                winCondition: changedScoresheet.winCondition,
                isCoop: changedScoresheet.isCoop,
                roundsScore: changedScoresheet.roundsScore,
                targetScore: changedScoresheet.targetScore,
              }
            : null,
          roundsToEdit: changedRounds,
          roundsToAdd: roundsToAdd,
          roundsToDelete: roundsToDelete,
        });
      } else {
        mutation.mutate({
          game: game,
          scoresheet: null,
          roundsToEdit: null,
          roundsToAdd: null,
          roundsToDelete: null,
        });
      }
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: game
      ? {
          name: game.name,
          ownedBy: game.ownedBy ?? false,
          gameImg: game.gameImg,
          playersMin: game.playersMin,
          playersMax: game.playersMax,
          playtimeMin: game.playtimeMin,
          playtimeMax: game.playtimeMax,
          yearPublished: game.yearPublished,
        }
      : {
          name: data.name,
          ownedBy: data.ownedBy ?? false,
          gameImg: data.imageUrl ?? null,
          playersMin: data.playersMin,
          playersMax: data.playersMax,
          playtimeMin: data.playtimeMin,
          playtimeMax: data.playtimeMax,
          yearPublished: data.yearPublished,
        },
  });
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);
  useEffect(() => {
    if (gameId !== data.id) {
      setGameId(data.id);
      setGame({
        name: data.name,
        ownedBy: data.ownedBy ?? false,
        gameImg: data.imageUrl ?? null,
        playersMin: data.playersMin,
        playersMax: data.playersMax,
        playtimeMin: data.playtimeMin,
        playtimeMax: data.playtimeMax,
        yearPublished: data.yearPublished,
      });
      setScoreSheet({
        name: data.scoresheet?.name ?? "Default",
        winCondition: data.scoresheet?.winCondition ?? "Highest Score",
        isCoop: data.scoresheet?.isCoop ?? false,
        roundsScore: data.scoresheet?.roundsScore ?? "Aggregate",
        targetScore: data.scoresheet?.targetScore ?? 0,
      });
      setScoresheetChanged(false);
      setRounds(data.rounds);
    }
  });
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsUploading(true);
    if (values.gameImg === data.imageUrl) {
      setIsUploading(false);
      updateGame({ imageId: undefined, values });
      return;
    }
    if (!values.gameImg) {
      setIsUploading(false);
      updateGame({ imageId: null, values });
      return;
    }

    try {
      const imageFile = values.gameImg as File;
      const uploadResult = await startUpload([imageFile]);
      if (!uploadResult) {
        throw new Error("Image upload failed");
      }

      const imageId = uploadResult[0]
        ? uploadResult[0].serverData.imageId
        : null;
      updateGame({
        values: {
          name: values.name,
          ownedBy: values.ownedBy,
          playersMin: values.playersMin,
          playersMax: values.playersMax,
          playtimeMin: values.playtimeMin,
          playtimeMax: values.playtimeMax,
          yearPublished: values.yearPublished,
          gameImg: null,
        },
        imageId: imageId,
      });
    } catch (error) {
      console.error("Error uploading Image:", error);
      toast({
        title: "Error",
        description: "There was a problem uploading your Image.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }
  return (
    <Card className="w-full sm:max-w-2xl">
      <CardHeader>
        <CardTitle>{`Edit ${data.name}`}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8">
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
                      <div className="relative flex shrink-0 overflow-hidden h-20 w-20">
                        {imagePreview ? (
                          <Image
                            src={imagePreview}
                            alt="Game image"
                            className="rounded-sm aspect-square h-full w-full object-cover"
                            fill
                          />
                        ) : (
                          <Dices className="h-full w-full p-2 items-center justify-center bg-muted rounded-full" />
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
                  <FormDescription>Upload an image (max 4MB).</FormDescription>
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
                  {(form.formState.errors.playersMin ||
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
                  {(form.formState.errors.playtimeMin ||
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
                      {form.formState.errors.yearPublished !== undefined ? (
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
                  <div className="flex justify-between items-center">
                    <div className="text-xl font-semibold">Scoresheet</div>
                    <Button
                      variant="default"
                      onClick={() => {
                        setGame(form.getValues());
                        router.push(
                          `/dashboard/games/${data.id}/edit/scoresheet`,
                        );
                      }}
                      type="button"
                    >
                      {scoresheet === null ? "Create New" : "Edit Sheet"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Table />
                    <div className="flex flex-grow justify-start items-start flex-col">
                      <span className="text-lg">
                        {scoresheet?.name ?? "Default"}
                      </span>
                      <div className="mb-2 flex w-full items-center gap-3 text-sm">
                        <div className="flex min-w-20 items-center gap-1">
                          <span>Win Condition:</span>
                          <span className="text-sm text-muted-foreground">
                            {scoresheet?.winCondition ?? "Highest Score"}
                          </span>
                        </div>
                        <Separator
                          orientation="vertical"
                          className="h-4 font-semi-bold"
                        />
                        <div className="flex min-w-20 items-center gap-1">
                          <span>Rounds:</span>
                          <span className="text-sm text-muted-foreground">
                            {rounds?.length ?? "1"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
          <CardFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button
              type="reset"
              variant="secondary"
              onClick={() => router.back()}
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
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
