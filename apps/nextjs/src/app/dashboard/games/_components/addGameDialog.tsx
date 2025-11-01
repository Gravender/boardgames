"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { usePostHog } from "posthog-js/react";
import { z } from "zod/v4";

import type { ImagePreviewType } from "@board-games/shared";
import type { UseFormReturn } from "@board-games/ui/form";
import {
  scoreSheetRoundsScore,
  scoreSheetWinConditions,
} from "@board-games/db/constants";
import {
  baseRoundSchema,
  createGameSchema,
  editRoleSchema,
  gameIcons,
  scoreSheetSchema,
} from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
} from "@board-games/ui/card";
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
import { useInvalidateGames } from "~/hooks/invalidate/game";
import { useFilteredRoles } from "~/hooks/use-filtered-roles";
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
    <Dialog open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <DialogContent className="p-2 sm:max-w-md sm:p-6">
        <Content setIsOpen={setIsOpen} />
      </DialogContent>
      <div className="flex h-full w-full flex-col justify-end">
        <div className="flex justify-end p-4">
          <Button
            variant="default"
            className="rounded-full"
            size="icon"
            onClick={() => setIsOpen(true)}
            aria-label="add game"
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
    roles: [],
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
  const [imagePreview, setImagePreview] = useState<ImagePreviewType>(
    game.gameImg?.type === "file"
      ? { type: "file", url: URL.createObjectURL(game.gameImg.file) }
      : game.gameImg?.type === "svg"
        ? { type: "svg", name: game.gameImg.name }
        : null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [gameRolesOpen, setGameRolesOpen] = useState(false);

  const trpc = useTRPC();
  const invalidateGames = useInvalidateGames();
  const posthog = usePostHog();

  const addGame = useMutation(
    trpc.game.create.mutationOptions({
      onSuccess: async (result) => {
        await Promise.all(invalidateGames());
        setImagePreview(null);
        form.reset();
        setIsUploading(false);
        setIsOpen(false);
        toast(`Game ${result.name} created successfully!`, {
          description: "Your data has been uploaded.",
        });
      },
      onError: (error) => {
        posthog.capture("game create error", { error });
        toast.error("Error", {
          description: "There was a problem adding your game.",
        });

        throw new Error("There was a problem adding your game.");
      },
    }),
  );

  const { startUpload } = useUploadThing("imageUploader");

  const form = useForm({
    schema: createGameSchema,
    defaultValues: game,
  });
  useEffect(() => {
    return () => {
      if (imagePreview?.type === "file") {
        URL.revokeObjectURL(imagePreview.url);
      }
    };
  }, [imagePreview]);

  const onSubmit = async (values: z.infer<typeof createGameSchema>) => {
    setIsUploading(true);
    posthog.capture("game create begin");
    if (values.gameImg === null || values.gameImg.type === "svg") {
      addGame.mutate({
        game: {
          name: values.name,
          ownedBy: values.ownedBy,
          playersMin: values.playersMin,
          playersMax: values.playersMax,
          playtimeMin: values.playtimeMin,
          playtimeMax: values.playtimeMax,
          yearPublished: values.yearPublished,
        },
        image:
          values.gameImg?.type === "svg"
            ? {
                type: "svg",
                name: values.gameImg.name,
              }
            : null,
        scoresheets: scoreSheets,
        roles: values.roles,
      });
    } else {
      try {
        const imageFile = values.gameImg.file;

        posthog.capture("upload begin", {
          type: "game",
          gameName: game.name,
          fileName: imageFile.name,
        });

        const uploadResult = await startUpload([imageFile], {
          usageType: "game",
        });

        if (!uploadResult) {
          toast.error("Error", {
            description: "There was a problem uploading your Image.",
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
          },
          image: imageId
            ? {
                type: "file",
                imageId: imageId,
              }
            : null,
          scoresheets: scoreSheets,
          roles: values.roles,
        });
      } catch (error) {
        console.error("Error uploading Image:", error);
        posthog.capture("upload error", { error });
        toast.error("Error", {
          description: "There was a problem uploading your Image.",
        });
      }
    }
  };
  const roles = form.watch("roles");
  if (gameRolesOpen) {
    const onSave = (roles: z.infer<typeof createGameSchema>["roles"]) => {
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
                    containerClassName="h-14 w-14 sm:h-20 sm:w-20"
                    userImageClassName="object-cover"
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
                                "ring-primary ring-2",
                            )}
                            onClick={() => {
                              field.onChange({
                                type: "svg",
                                name: option.name,
                              });
                              if (imagePreview?.type === "file") {
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
                    placeholder="Custom Image"
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
                        if (imagePreview?.type === "file") {
                          URL.revokeObjectURL(imagePreview.url);
                        }
                        setImagePreview({
                          type: "file",
                          url: URL.createObjectURL(file),
                        });
                      }
                    }}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ownedBy"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-y-0 space-x-3">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGameRolesOpen(true)}
            >
              Edit Game Roles{roles.length > 0 && ` (${roles.length})`}
            </Button>
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
                        className="flex grow flex-col items-start justify-start"
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
                            <span className="text-muted-foreground text-sm">
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
const RolesForm = ({
  originalRoles,
  onSave,
  onClose,
}: {
  originalRoles: { id: number; name: string; description: string | null }[];
  onSave: (
    roles: { id: number; name: string; description: string | null }[],
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
  const roles = form.watch("roles");
  const { append: appendRole, remove: removeRole } = useFieldArray({
    control: form.control,
    name: "roles",
  });

  const filteredRoles = useFilteredRoles(
    roles.map((r) => ({ ...r, type: "original" })),
    roleSearchTerm,
  );
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <CardContent className="space-y-8">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
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
                          description:
                            e.target.value === "" ? null : e.target.value,
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
                            <p className="text-muted-foreground max-w-xs truncate text-xs">
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
        <DialogFooter className="gap-2">
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
  const form = useForm({
    schema: scoreSheetWithRoundsSchema.check((ctx) => {
      if (
        ctx.value.scoresheet.winCondition !== "Manual" &&
        ctx.value.scoresheet.roundsScore === "None"
      ) {
        ctx.issues.push({
          code: "custom",
          input: ctx.value,
          message:
            "Rounds score cannot be None when win condition is not Manual.",
          path: ["scoresheet.roundsScore"],
        });
      }
      if (ctx.value.scoresheet.isCoop) {
        if (
          ctx.value.scoresheet.winCondition !== "Manual" &&
          ctx.value.scoresheet.winCondition !== "Target Score"
        ) {
          ctx.issues.push({
            code: "custom",
            input: ctx.value,
            message:
              "Win condition must be Manual or Target Score for Coop games.",
            path: ["scoresheet.winCondition"],
          });
        }
      }
      if (
        ctx.value.scoresheet.winCondition !== "Manual" &&
        ctx.value.scoresheet.roundsScore !== "Manual" &&
        ctx.value.rounds.length === 0
      ) {
        ctx.issues.push({
          code: "custom",
          input: ctx.value,
          message:
            "Rounds cannot be empty when win condition is not Manual and rounds score is not Manual.",
          path: ["scoresheet.roundsScore"],
          params: {
            roundsScore: ctx.value.scoresheet.roundsScore,
            winCondition: ctx.value.scoresheet.winCondition,
            rounds: ctx.value.rounds,
          },
        });
        ctx.issues.push({
          code: "custom",
          input: ctx.value,
          message:
            "Rounds cannot be empty when win condition is not Manual and rounds score is not Manual.",
          path: ["scoresheet.winCondition"],
          params: {
            roundsScore: ctx.value.scoresheet.roundsScore,
            winCondition: ctx.value.scoresheet.winCondition,
            rounds: ctx.value.rounds,
          },
        });
      }
    }),
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

  const winConditionOptions = scoreSheetWinConditions;
  const roundsScoreOptions: (typeof scoreSheetRoundsScore)[number][] =
    scoreSheetRoundsScore.filter((option) => option !== "None");

  const manualWinConditionOptions = scoreSheetRoundsScore;
  const coopWinConditionOptions: (typeof scoreSheetWinConditions)[number][] = [
    "Manual",
    "Target Score",
  ];
  const formWinCondition = form.watch("scoresheet.winCondition");
  const formRoundsScore = form.watch("scoresheet.roundsScore");
  const formIsCoop = form.watch("scoresheet.isCoop");

  useEffect(() => {
    if (formWinCondition !== "Manual" && formRoundsScore === "None") {
      form.setValue("scoresheet.roundsScore", "Aggregate");
    }
    if (formIsCoop) {
      if (
        formWinCondition !== "Manual" &&
        formWinCondition !== "Target Score"
      ) {
        form.setValue("scoresheet.winCondition", "Manual");
      }
    }
  }, [formWinCondition, formRoundsScore, form, formIsCoop]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="flex flex-col gap-2 px-2 sm:gap-4 sm:px-6">
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
              <FormItem className="flex flex-row items-start gap-2 space-y-0 space-x-3">
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
    <div className="flex flex-col gap-2 pb-4">
      <div className="text-xl font-semibold">Rows</div>
      <div className="flex max-h-[25vh] flex-col gap-2 overflow-auto">
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
