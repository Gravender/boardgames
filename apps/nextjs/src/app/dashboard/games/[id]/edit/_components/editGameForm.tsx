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
  Search,
  SquarePen,
  Table,
  Trash,
  Trash2,
} from "lucide-react";
import { z } from "zod/v4";

import type { RouterInputs, RouterOutputs } from "@board-games/api";
import type { ImagePreviewType } from "@board-games/shared";
import type { UseFormReturn } from "@board-games/ui/form";
import {
  scoreSheetRoundsScore,
  scoreSheetWinConditions,
} from "@board-games/db/constants";
import {
  editGameSchema,
  editRoleSchema,
  editScoresheetSchema,
  gameIcons,
  roundsSchema,
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
  CardAction,
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
  FormDescription,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import { ScrollArea } from "@board-games/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import { Separator } from "@board-games/ui/separator";
import { Textarea } from "@board-games/ui/textarea";
import { toast } from "@board-games/ui/toast";
import { cn } from "@board-games/ui/utils";

import { GradientPicker } from "~/components/color-picker";
import { GameImage } from "~/components/game-image";
import { Spinner } from "~/components/spinner";
import { useFilteredRoles } from "~/hooks/use-filtered-roles";
import { useTRPC } from "~/trpc/react";
import { useUploadThing } from "~/utils/uploadthing";
import { RoundPopOver } from "./roundPopOver";

export const scoresheetSchema = editScoresheetSchema.extend({
  scoresheetType: z.literal("original").or(z.literal("shared")),
  permission: z.literal("view").or(z.literal("edit")).nullable(),
  scoresheetId: z.number().nullable(),
  rounds: roundsSchema,
  scoreSheetChanged: z.boolean(),
  roundChanged: z.boolean(),

  isDefault: z.boolean().optional(),
});
const scoresheetsSchema = z
  .array(scoresheetSchema)
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
  data: NonNullable<RouterOutputs["game"]["getEditGame"]>;
}) {
  const [moreOptions, setMoreOptions] = useState(false);
  const [game, setGame] = useState<z.infer<typeof editGameSchema>>({
    ...data.game,
    gameImg: data.game.gameImg
      ? data.game.gameImg.type === "file"
        ? {
            type: "file" as const,
            file: data.game.gameImg.url ?? "",
          }
        : {
            type: "svg" as const,
            name: data.game.gameImg.name,
          }
      : null,
    roles: data.roles,
  });
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

  const updateScoreSheets = (scoresheet: z.infer<typeof scoresheetSchema>) => {
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
          return {
            ...prevScoreSheet,
            isDefault: false,
            scoreSheetChanged: prevScoreSheet.isDefault
              ? true
              : prevScoreSheet.scoreSheetChanged,
          };
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
              scoresheetId: null,
              permission: "edit",
              scoresheetType: "original",
              name:
                scoresheets.length === 0
                  ? "Default"
                  : `Scoresheet ${scoresheets.length}`,
              winCondition: "Highest Score",
              isCoop: false,
              roundsScore: "Aggregate",
              targetScore: 0,
              scoreSheetChanged: true,
              roundChanged: true,

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
  data: NonNullable<RouterOutputs["game"]["getEditGame"]>;
  game: z.infer<typeof editGameSchema>;
  scoresheets: z.infer<typeof scoresheetsSchema>;
  moreOptions: boolean;
  activeScoreSheet: number;
  setGame: (game: z.infer<typeof editGameSchema>) => void;
  setScoresheets: (scoresheets: z.infer<typeof scoresheetsSchema>) => void;
  setActiveScoreSheet: (activeScoreSheet: number) => void;
  setIsScoresheet: (isScoresheet: boolean) => void;
  setMoreOptions: (moreOptions: boolean) => void;
}) => {
  const trpc = useTRPC();
  const [imagePreview, setImagePreview] = useState<ImagePreviewType>(
    game.gameImg?.type === "file"
      ? {
          type: "file",
          url:
            game.gameImg.file instanceof File
              ? URL.createObjectURL(game.gameImg.file)
              : game.gameImg.file,
        }
      : game.gameImg?.type === "svg"
        ? { type: "svg", name: game.gameImg.name }
        : null,
  );
  const [openAlert, setOpenAlert] = useState(false);
  const [gameRolesOpen, setGameRolesOpen] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const { startUpload } = useUploadThing("imageUploader");
  const router = useRouter();

  const queryClient = useQueryClient();
  const mutation = useMutation(
    trpc.game.updateGame.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.game.getGames.queryOptions());
        await queryClient.invalidateQueries(
          trpc.game.getGame.queryOptions({ id: data.game.id }),
        );
        await queryClient.invalidateQueries(
          trpc.game.getGameRoles.queryOptions({
            gameId: data.game.id,
          }),
        );
        await queryClient.invalidateQueries(
          trpc.game.getEditGame.queryOptions({ id: data.game.id }),
        );
        await queryClient.invalidateQueries(
          trpc.game.getGameMetaData.queryOptions({ id: data.game.id }),
        );
        await queryClient.invalidateQueries(
          trpc.game.getGameName.queryOptions({ id: data.game.id }),
        );
        await queryClient.invalidateQueries(
          trpc.game.getGameStats.queryOptions({ id: data.game.id }),
        );
        await queryClient.invalidateQueries(
          trpc.dashboard.getGames.queryOptions(),
        );
        toast("Game updated successfully!");
        form.reset();
        setImagePreview(null);
        router.push(`/dashboard/games`);
      },
    }),
  );

  const form = useForm({
    schema: editGameSchema,
    defaultValues: game,
  });

  const updateGame = ({
    image,
    values,
  }: {
    image:
      | {
          type: "svg";
          name: string;
        }
      | {
          type: "file";
          imageId: number;
        }
      | null
      | undefined;
    values: z.infer<typeof editGameSchema>;
  }) => {
    const nameChanged = values.name !== data.game.name;
    const ownedByChanged = values.ownedBy !== data.game.ownedBy;
    const playersMinChanged = values.playersMin !== data.game.playersMin;
    const playersMaxChanged = values.playersMax !== data.game.playersMax;
    const playtimeMinChanged = values.playtimeMin !== data.game.playtimeMin;
    const playtimeMaxChanged = values.playtimeMax !== data.game.playtimeMax;
    const yearPublishedChanged =
      values.yearPublished !== data.game.yearPublished;
    const imageChanged = image !== undefined;
    const scoresheetChanged = scoresheets.some(
      (scoresheet) => scoresheet.scoreSheetChanged || scoresheet.roundChanged,
    );
    const rolesChanged =
      values.roles.some((role) => {
        const originalRole = data.roles.find((r) => r.id === role.id);
        return (
          originalRole?.name !== role.name ||
          originalRole.description !== role.description
        );
      }) ||
      values.roles.some((role) => role.id < 0) ||
      data.roles.filter(
        (role) => !values.roles.find((vRole) => vRole.id === role.id),
      ).length > 0;
    const gameChanged =
      nameChanged ||
      ownedByChanged ||
      playersMinChanged ||
      playersMaxChanged ||
      playtimeMinChanged ||
      playtimeMaxChanged ||
      yearPublishedChanged ||
      imageChanged;

    if (gameChanged || scoresheetChanged || rolesChanged) {
      const updatedRoles = values.roles
        .map((role) => {
          const originalRole = data.roles.find((r) => r.id === role.id);
          if (originalRole === undefined) return null;
          const nameChanged = role.name !== originalRole.name;
          const descriptionChanged =
            role.description !== originalRole.description;
          if (!nameChanged && !descriptionChanged) return null;
          return {
            id: role.id,
            name: role.name,
            description: role.description,
          };
        })
        .filter((role) => role !== null);
      const newRoles = values.roles.filter((role) => role.id < 0);
      const deletedRoles = data.roles
        .filter((role) => !values.roles.find((vRole) => vRole.id === role.id))
        .map((role) => role.id);
      const game = gameChanged
        ? {
            type: "updateGame" as const,
            id: data.game.id,
            name: nameChanged ? values.name : undefined,
            ownedBy: ownedByChanged ? values.ownedBy : undefined,
            playersMin: playersMinChanged ? values.playersMin : undefined,
            playersMax: playersMaxChanged ? values.playersMax : undefined,
            playtimeMin: playtimeMinChanged ? values.playtimeMin : undefined,
            playtimeMax: playtimeMaxChanged ? values.playtimeMax : undefined,
            yearPublished: yearPublishedChanged
              ? values.yearPublished
              : undefined,
            image: image,
          }
        : { type: "default" as const, id: data.game.id };
      if (scoresheetChanged) {
        const changedScoresheets = scoresheets
          .filter(
            (scoresheet) =>
              scoresheet.scoreSheetChanged || scoresheet.roundChanged,
          )
          .map<
            | RouterInputs["game"]["updateGame"]["scoresheets"][number]
            | undefined
          >((scoresheet) => {
            const foundScoresheet = data.scoresheets.find(
              (dataScoresheet) =>
                dataScoresheet.id === scoresheet.scoresheetId &&
                dataScoresheet.scoresheetType === scoresheet.scoresheetType,
            );
            if (!foundScoresheet) {
              const newScoresheet: Extract<
                RouterInputs["game"]["updateGame"]["scoresheets"][number],
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
                RouterInputs["game"]["updateGame"]["scoresheets"][number],
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
                      name: scoresheetName,
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
                  scoresheetType: scoresheet.scoresheetType,
                  name: scoresheetName,
                  winCondition: scoresheetWinCondition,
                  isCoop: scoresheetIsCoop ?? foundScoresheet.isCoop,
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
                  scoresheet.scoresheetId === foundScoresheet.id &&
                  scoresheet.scoresheetType === foundScoresheet.scoresheetType,
              ),
          )
          .map((foundScoresheet) => {
            return {
              id: foundScoresheet.id,
              scoresheetType: foundScoresheet.scoresheetType,
            };
          });
        mutation.mutate({
          game: game,
          scoresheets: changedScoresheets,
          scoresheetsToDelete: scoresheetsToDelete,
          updatedRoles: updatedRoles,
          newRoles: newRoles,
          deletedRoles: deletedRoles,
        });
      } else {
        mutation.mutate({
          game: game,
          scoresheets: [],
          scoresheetsToDelete: [],
          updatedRoles: updatedRoles,
          newRoles: newRoles,
          deletedRoles: deletedRoles,
        });
      }
    }
  };
  useEffect(() => {
    return () => {
      if (
        imagePreview !== null &&
        imagePreview.type === "file" &&
        (game.gameImg === null ||
          !(
            game.gameImg.type === "file" &&
            imagePreview.url == game.gameImg.file
          ))
      ) {
        URL.revokeObjectURL(imagePreview.url);
      }
    };
  }, [game.gameImg, imagePreview]);
  async function onSubmit(values: z.infer<typeof editGameSchema>) {
    setIsUploading(true);
    const isSameImage = () => {
      if (values.gameImg === null && data.game.gameImg === null) return true;
      if (values.gameImg?.type === data.game.gameImg?.type) {
        if (values.gameImg?.type === "file") {
          return values.gameImg.file === data.game.gameImg?.url;
        }
        if (values.gameImg?.type === "svg") {
          return values.gameImg.name === data.game.gameImg?.name;
        }
      }
      return false;
    };
    if (isSameImage()) {
      setIsUploading(false);
      updateGame({ image: undefined, values });
      return;
    }
    if (values.gameImg === null) {
      setIsUploading(false);
      updateGame({ image: null, values });
      return;
    }
    if (values.gameImg.type === "svg") {
      setIsUploading(false);
      updateGame({
        image: {
          type: "svg",
          name: values.gameImg.name,
        },
        values,
      });
      return;
    }
    try {
      const imageFile = values.gameImg.file as File;
      const uploadResult = await startUpload([imageFile], {
        usageType: "game",
      });
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
          gameImg: {
            type: "file",
            file: "",
          },
          roles: values.roles,
        },
        image: imageId
          ? {
              type: "file",
              imageId: imageId,
            }
          : null,
      });
    } catch (error) {
      console.error("Error uploading Image:", error);
      toast.error("Error", {
        description: "There was a problem uploading your Image.",
      });
    } finally {
      setIsUploading(false);
    }
  }
  const roles = form.watch("roles");

  if (gameRolesOpen) {
    const onSave = (roles: z.infer<typeof editGameSchema>["roles"]) => {
      form.setValue("roles", roles);
      setGameRolesOpen(false);
    };

    return (
      <RolesForm
        originalRoles={roles}
        onSave={onSave}
        onClose={() => setGameRolesOpen(false)}
      />
    );
  }

  return (
    <AlertDialog open={openAlert} onOpenChange={setOpenAlert}>
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
                      <GameImage
                        image={
                          imagePreview
                            ? imagePreview.type === "svg"
                              ? {
                                  name: imagePreview.name,
                                  url: "",
                                  type: "svg",
                                  usageType: "game",
                                }
                              : {
                                  name: "Game Preview Image",
                                  url: imagePreview.url,
                                  type: "file",
                                  usageType: "game",
                                }
                            : null
                        }
                        alt="Game image"
                        containerClassName="h-20 w-20"
                        userImageClassName="rounded-sm object-cover"
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline">Icons</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <h4 className="mb-2 font-medium">Select an Icon</h4>
                          <div className="grid grid-cols-4 gap-2">
                            {gameIcons.map((option) => (
                              <Button
                                key={option.name}
                                type="button"
                                variant="outline"
                                size="icon"
                                className={cn(
                                  "h-12 w-12 p-2",
                                  imagePreview?.type === "svg" &&
                                    imagePreview.name === option.name &&
                                    "ring-2 ring-primary",
                                )}
                                onClick={() => {
                                  field.onChange({
                                    type: "svg",
                                    name: option.name,
                                  });
                                  if (
                                    imagePreview !== null &&
                                    imagePreview.type === "file" &&
                                    (game.gameImg === null ||
                                      !(
                                        game.gameImg.type === "file" &&
                                        imagePreview.url == game.gameImg.file
                                      ))
                                  ) {
                                    URL.revokeObjectURL(imagePreview.url);
                                  }
                                  setImagePreview({
                                    type: "svg",
                                    name: option.name,
                                  });
                                }}
                              >
                                <option.icon className="h-full w-full" />
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          field.onChange(
                            file
                              ? {
                                  type: "file",
                                  file: file,
                                }
                              : null,
                          );
                          if (file) {
                            if (
                              imagePreview !== null &&
                              imagePreview.type === "file" &&
                              (game.gameImg === null ||
                                !(
                                  game.gameImg.type === "file" &&
                                  imagePreview.url == game.gameImg.file
                                ))
                            ) {
                              URL.revokeObjectURL(imagePreview.url);
                            }

                            const url = URL.createObjectURL(file);
                            setImagePreview({
                              type: "file",
                              url: url,
                            });
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

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGameRolesOpen(true)}
                >
                  Edit Game Roles{roles.length > 0 && ` (${roles.length})`}
                </Button>

                <Separator className="w-full" orientation="horizontal" />
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-semibold">Scoresheet</div>
                    <Button
                      variant="default"
                      onClick={() => {
                        setGame(form.getValues());
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
                          key={`${index}-${scoreSheet.scoresheetId}`}
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
                                <span className="text-sm text-muted-foreground">
                                  {scoreSheet.winCondition ?? "Highest Score"}
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
                            onClick={() => {
                              setActiveScoreSheet(index);
                              setOpenAlert(true);
                            }}
                            disabled={
                              scoreSheet.scoresheetType === "original" &&
                              scoresheets.filter(
                                (scoresheet) =>
                                  scoresheet.scoresheetType === "original",
                              ).length === 1
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
          </CardContent>
          <CardFooter className="flex flex-row justify-end gap-2">
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

const RolesForm = ({
  originalRoles,
  onSave,
  onClose,
}: {
  originalRoles: { id: number; name: string; description: string | null }[];
  onSave: (
    rounds: { id: number; name: string; description: string | null }[],
  ) => void;
  onClose: () => void;
}) => {
  const [editGameRoleIndex, setEditGameRoleIndex] = useState<number | null>(
    null,
  );
  const [roleSearchTerm, setRoleSearchTerm] = useState("");
  const [newGameRole, setNewGameRole] = useState<{
    name: string;
    description: string | null;
  }>({
    name: "",
    description: null,
  });

  const formSchema = z.object({
    roles: z.array(editRoleSchema),
  });
  const form = useForm({
    schema: formSchema,
    defaultValues: { roles: originalRoles },
  });
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    onSave(data.roles);
  };
  const {
    append: appendRole,
    remove: removeRole,
    fields: roles,
  } = useFieldArray({
    control: form.control,
    name: "roles",
  });

  const filteredRoles = useFilteredRoles(roles, roleSearchTerm);
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <CardContent className="space-y-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              placeholder="Search roles..."
              value={roleSearchTerm}
              onChange={(e) => setRoleSearchTerm(e.target.value)}
              className="pl-10 text-sm"
              aria-label="Search roles"
              type="search"
            />
          </div>
          <ScrollArea>
            <div className="flex max-h-[40vh] flex-col gap-2">
              {editGameRoleIndex === -1 ? (
                <Card className="gap-2 p-2 py-2">
                  <CardContent className="flex flex-col gap-4 px-2">
                    <Input
                      placeholder="Role Name"
                      value={newGameRole.name}
                      onChange={(e) => {
                        setNewGameRole({
                          name: e.target.value,
                          description: newGameRole.description,
                        });
                      }}
                    />
                    <Textarea
                      placeholder="Role Description"
                      value={newGameRole.description ?? ""}
                      onChange={(e) =>
                        setNewGameRole({
                          name: newGameRole.name,
                          description: e.target.value,
                        })
                      }
                    />
                  </CardContent>
                  <CardFooter className="justify-end gap-2 p-2 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setEditGameRoleIndex(null);
                        setNewGameRole({
                          name: "",
                          description: null,
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        const minId = Math.min(
                          ...roles.map((role) => role.id),
                          0,
                        );
                        appendRole({
                          id: isNaN(minId) ? -1 : minId - 1,
                          name: newGameRole.name,
                          description: newGameRole.description,
                        });
                        setEditGameRoleIndex(null);
                        setNewGameRole({
                          name: "",
                          description: null,
                        });
                      }}
                    >
                      Save
                    </Button>
                  </CardFooter>
                </Card>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setEditGameRoleIndex(-1);
                  }}
                >
                  <Plus />
                  Role
                </Button>
              )}
              {filteredRoles.map((role) => {
                const roleIndex = roles.findIndex((r) => r.id === role.id);
                if (roleIndex === editGameRoleIndex) {
                  return (
                    <Card key={role.id} className="gap-2 p-2 py-2">
                      <CardContent className="flex flex-col gap-2 px-2">
                        <FormField
                          control={form.control}
                          name={`roles.${roleIndex}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="sr-only">Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Role name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`roles.${roleIndex}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="sr-only">
                                Description
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Description for role"
                                  className="resize-none"
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={(e) => {
                                    if (e.target.value === "") {
                                      field.onChange(null);
                                      return;
                                    }
                                    field.onChange(e.target.value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                      <CardFooter className="justify-end p-2 pt-2">
                        <CardAction>
                          <Button
                            type="button"
                            onClick={() => {
                              setEditGameRoleIndex(null);
                            }}
                          >
                            Save
                          </Button>
                        </CardAction>
                      </CardFooter>
                    </Card>
                  );
                }

                return (
                  <Card key={role.id} className="p-2 py-2">
                    <CardContent className="flex flex-row justify-between gap-2 px-4">
                      <div className="flex flex-1 items-center gap-3">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium">{role.name}</h4>
                          {role.description && (
                            <p className="max-w-xs truncate text-xs text-muted-foreground">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditGameRoleIndex(roleIndex)}
                        >
                          <SquarePen className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRole(roleIndex)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </CardFooter>
      </form>
    </Form>
  );
};

const ScoresheetForm = ({
  scoresheet,
  setScoresheet,
  setIsScoresheet,
}: {
  scoresheet: z.infer<typeof scoresheetSchema>;
  setScoresheet: (scoresheet: z.infer<typeof scoresheetSchema>) => void;
  setIsScoresheet: (isScoresheet: boolean) => void;
}) => {
  const form = useForm({
    schema: scoresheetSchema.check((ctx) => {
      if (ctx.value.isCoop) {
        if (
          ctx.value.winCondition !== "Manual" &&
          ctx.value.winCondition !== "Target Score"
        ) {
          ctx.issues.push({
            code: "custom",
            input: ctx.value,
            message:
              "Win condition must be Manual or Target Score for Coop games.",
            path: ["winCondition"],
          });
        }
      }
    }),

    defaultValues: scoresheet,
  });
  const onBack = () => {
    setIsScoresheet(false);
  };
  const onSubmit = (data: z.infer<typeof scoresheetSchema>) => {
    data.scoreSheetChanged = true;
    data.roundChanged = true;
    setScoresheet(data);
    onBack();
  };

  const winConditionOptions = scoreSheetWinConditions;
  const roundsScoreOptions = scoreSheetRoundsScore;
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            disabled={scoresheet.permission === "view"}
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
            disabled={scoresheet.permission === "view"}
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
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
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
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
            disabled={scoresheet.permission === "view"}
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
                    {form.getValues("isCoop")
                      ? winConditionOptions
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
                      : winConditionOptions.map((condition) => (
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
          {form.getValues("winCondition") === "Target Score" && (
            <FormField
              control={form.control}
              name={`targetScore`}
              disabled={scoresheet.permission === "view"}
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
            disabled={scoresheet.permission === "view"}
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
          <AddRounds form={form} editable={scoresheet.permission === "edit"} />
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
  form: UseFormReturn<z.infer<typeof scoresheetSchema>>;
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
