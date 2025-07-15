import { Fragment, useState } from "react";
import { ActivityIndicator, Alert, Image, View } from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@clerk/clerk-expo";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";

import {
  insertRoundSchema,
  insertScoreSheetSchema,
} from "@board-games/db/zodSchema";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Text } from "~/components/ui/text";
import { ChevronDown } from "~/lib/icons/ChevronDown";
import { ChevronUp } from "~/lib/icons/ChevronUp";
import { Dices } from "~/lib/icons/Dices";
import { Plus } from "~/lib/icons/Plus";
import { Table } from "~/lib/icons/Table";
import { trpc } from "~/utils/api";
import { useUploadThing } from "~/utils/uploadthing";
import AddScoresheetModal from "./AddScoresheetModal";
import { Separator } from "./ui/separator";

export const scoresheetSchema = insertScoreSheetSchema
  .pick({
    name: true,
    isCoop: true,
    winCondition: true,
    roundsScore: true,
    targetScore: true,
  })
  .required({ name: true, isCoop: true, winCondition: true });
export type ScoreSheetType = z.infer<typeof scoresheetSchema>;
export const roundsSchema = z.array(
  insertRoundSchema
    .pick({
      name: true,
      type: true,
      score: true,
      color: true,
    })
    .required({ name: true }),
);
export type RoundsType = z.infer<typeof roundsSchema>;
export function AddGame({ portalHost }: { portalHost: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Fragment>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="min-w-[400px] sm:max-w-[425px]"
          portalHost={portalHost}
        >
          <AddGameContent setIsOpen={setIsOpen} />
        </DialogContent>

        <DialogTrigger asChild>
          <Button variant="default" className="h-12 w-12 rounded-full">
            <Plus
              className="text-primary-foreground"
              size={20}
              strokeWidth={1.5}
            />
          </Button>
        </DialogTrigger>
      </Dialog>
    </Fragment>
  );
}

const gamesSchema = z
  .object({
    name: z.string().min(1, {
      message: "Game name is required",
    }),
    ownedBy: z.boolean(),
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
  .check((ctx) => {
    if (
      ctx.value.playersMin &&
      ctx.value.playersMax &&
      ctx.value.playersMin > ctx.value.playersMax
    ) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        message: "Players min must be less than or equal to players max.",
        path: ["playersMin"],
      });
    }
    if (
      ctx.value.playtimeMin &&
      ctx.value.playtimeMax &&
      ctx.value.playtimeMin > ctx.value.playtimeMax
    ) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        message: "Playtime min must be less than or equal to playtime max.",
        path: ["playtimeMin"],
      });
    }
  });
const formSchema = z.object({
  game: gamesSchema,
  scoresheet: scoresheetSchema.or(z.null()),
  rounds: roundsSchema,
});
function AddGameContent({
  setIsOpen,
}: {
  setIsOpen: (isOpen: boolean) => void;
}) {
  const [imagePreview, setImagePreview] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [openScoresheetModal, setOpenScoresheetModal] = useState(false);
  const [moreOptions, setMoreOptions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const queryClient = useQueryClient();

  const { getToken } = useAuth();
  const { startUpload } = useUploadThing("imageUploader", {
    headers: async () => {
      const authToken = await getToken();
      return { Authorization: authToken ?? undefined };
    },
    onUploadError: (err: unknown) => {
      let errorMessage = "Unknown error occurred";

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "object" && err !== null && "message" in err) {
        errorMessage = String(err.message);
      }

      console.log("Error: ", errorMessage);
      Alert.alert("Upload Error", errorMessage);
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      game: {
        name: "",
        playersMin: null,
        playersMax: null,
        playtimeMin: null,
        playtimeMax: null,
        yearPublished: null,
        ownedBy: false,
      },
      scoresheet: null,
      rounds: [],
    },
  });

  const createGame = useMutation(
    trpc.game.create.mutationOptions({
      onSuccess: async () => {
        setIsUploading(false);
        await queryClient.invalidateQueries(trpc.game.getGames.queryOptions());
        await queryClient.invalidateQueries(
          trpc.dashboard.getGames.queryOptions(),
        );
        await queryClient.invalidateQueries(
          trpc.dashboard.getUniqueGames.queryOptions(),
        );
        form.reset();
        setIsOpen(false);
      },
    }),
  );

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsUploading(true);
    if (!imagePreview) {
      createGame.mutate({
        game: {
          name: values.game.name,
          ownedBy: values.game.ownedBy,
          playersMin: values.game.playersMin,
          playersMax: values.game.playersMax,
          playtimeMin: values.game.playtimeMin,
          playtimeMax: values.game.playtimeMax,
          yearPublished: values.game.yearPublished,
        },
        image: null,
        scoresheets: values.scoresheet
          ? [
              {
                scoresheet: values.scoresheet,
                rounds: values.rounds.map((round, index) => ({
                  ...round,
                  order: index,
                })),
              },
            ]
          : [],
        roles: [],
      });
      return;
    }
    try {
      console.log("Media URI:", imagePreview.uri);
      const fileInfo = await FileSystem.getInfoAsync(imagePreview.uri);
      if (!fileInfo.exists) {
        throw new Error("File does not exist");
      }

      // Create a file-like object that UploadThing can handle
      const fileToUpload = {
        name: imagePreview.fileName ?? "image.jpg",
        type: imagePreview.mimeType ?? imagePreview.type ?? "image/jpeg",
        uri: imagePreview.uri,
        size: fileInfo.size,
      } as unknown as File;
      const uploadResult = await startUpload([fileToUpload], {
        usageType: "game",
      });
      if (!uploadResult) {
        throw new Error("Image upload failed");
      }
      const imageId = uploadResult[0]
        ? uploadResult[0].serverData.imageId
        : null;
      createGame.mutate({
        game: {
          name: values.game.name,
          ownedBy: values.game.ownedBy,
          playersMin: values.game.playersMin,
          playersMax: values.game.playersMax,
          playtimeMin: values.game.playtimeMin,
          playtimeMax: values.game.playtimeMax,
          yearPublished: values.game.yearPublished,
        },
        image: imageId
          ? {
              type: "file",
              imageId: imageId,
            }
          : null,
        scoresheets: values.scoresheet
          ? [
              {
                scoresheet: values.scoresheet,
                rounds: values.rounds.map((round, index) => ({
                  ...round,
                  order: index,
                })),
              },
            ]
          : [],
        roles: [],
      });
      form.reset();
      setImagePreview(null);
    } catch (error) {
      console.error("Upload error:", error);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onChangeNumberText = (onChange: (...event: any[]) => void) => {
    return (text: string) => {
      if (text === "") {
        onChange(null);
      } else {
        onChange(parseInt(text));
      }
    };
  };

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Camera roll permissions are required.",
      );
      return;
    }

    const response = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: false,
      quality: 1,
    });

    if (!response.canceled) {
      const [media] = response.assets;
      if (media) {
        if (media.fileSize && media.fileSize <= 5242880) {
          setImagePreview(media);
        } else {
          Alert.alert(
            "File size exceeds 4MB.",
            "Please select a diffrent image.",
          );
        }
      }
    }
  }
  return (
    <Fragment>
      <DialogHeader>
        <DialogTitle>Add Game</DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <View className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="game.name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Game Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Game Name"
                    onChangeText={field.onChange}
                    value={field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <View>
            <View className="flex flex-row items-center gap-4">
              <View className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded-full">
                {imagePreview ? (
                  <Image
                    source={{ uri: imagePreview.uri }}
                    className="aspect-square h-full w-full rounded-md object-cover"
                  />
                ) : (
                  <Dices
                    className="rounded-full bg-muted text-primary"
                    size={60}
                    strokeWidth={1.4}
                  />
                )}
              </View>
              <Button
                className="flex-grow"
                variant="outline"
                onPress={pickImage}
              >
                <Text>
                  {imagePreview ? "Change Image" : "No Image Selected"}
                </Text>
              </Button>
            </View>
            <Text className="text-muted-foreground">
              Upload an image (max 4MB).
            </Text>
          </View>
          <FormField
            control={form.control}
            name="game.ownedBy"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-3">
                <FormLabel>Owned by</FormLabel>
                <FormControl>
                  <Checkbox
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <Collapsible open={moreOptions} onOpenChange={setMoreOptions}>
            <CollapsibleTrigger className="flex flex-row items-center gap-2">
              <Text>More options</Text>
              {moreOptions ? (
                <ChevronUp
                  className="h-4 w-4 text-foreground"
                  size={16}
                  strokeWidth={1.5}
                />
              ) : (
                <ChevronDown
                  className="h-4 w-4 text-foreground"
                  size={16}
                  strokeWidth={1.5}
                />
              )}
            </CollapsibleTrigger>

            <CollapsibleContent className="flex flex-col gap-4">
              <View className="flex flex-col gap-2 pt-4">
                {/* Players */}
                <View className="flex flex-row items-center gap-4">
                  <Label className="w-24">Players</Label>
                  <View className="flex-1">
                    <FormField
                      control={form.control}
                      name="game.playersMin"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Min"
                              keyboardType="numeric"
                              onChangeText={onChangeNumberText(field.onChange)}
                              value={
                                field.value
                                  ? `${field.value.toString()}`
                                  : undefined
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </View>
                  <View className="flex-1">
                    <FormField
                      control={form.control}
                      name="game.playersMax"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Max"
                              keyboardType="numeric"
                              onChangeText={onChangeNumberText(field.onChange)}
                              value={
                                field.value
                                  ? `${field.value.toString()}`
                                  : undefined
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </View>
                </View>
                {/* Error Messages for Players */}
                {(form.formState.errors.game?.playersMin ??
                  form.formState.errors.game?.playersMax) && (
                  <View className="flex flex-row items-center gap-4">
                    <View className="w-24" />
                    {form.formState.errors.game.playersMin !== undefined ? (
                      <FormMessage className="flex-1">
                        {form.formState.errors.game.playersMin.message}
                      </FormMessage>
                    ) : (
                      <View />
                    )}
                    {form.formState.errors.game.playersMax !== undefined ? (
                      <FormMessage className="flex-1">
                        {form.formState.errors.game.playersMax.message}
                      </FormMessage>
                    ) : (
                      <View />
                    )}
                  </View>
                )}

                {/* Playtime */}
                <View className="flex flex-row items-center gap-4">
                  <Label className="w-24">Playtime</Label>
                  <View className="flex-1">
                    <FormField
                      control={form.control}
                      name="game.playtimeMin"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Min"
                              keyboardType="numeric"
                              onChangeText={onChangeNumberText(field.onChange)}
                              value={
                                field.value
                                  ? `${field.value.toString()}`
                                  : undefined
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </View>
                  <View className="flex-1">
                    <FormField
                      control={form.control}
                      name="game.playtimeMax"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Max"
                              keyboardType="numeric"
                              onChangeText={onChangeNumberText(field.onChange)}
                              value={
                                field.value
                                  ? `${field.value.toString()}`
                                  : undefined
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </View>
                </View>
                {/* Error Messages for Playtime */}
                {(form.formState.errors.game?.playtimeMin ??
                  form.formState.errors.game?.playtimeMax) && (
                  <View className="flex flex-row items-center gap-4">
                    <View className="w-24" />
                    {form.formState.errors.game.playtimeMin !== undefined ? (
                      <FormMessage className="flex-1">
                        {form.formState.errors.game.playtimeMin.message}
                      </FormMessage>
                    ) : (
                      <View />
                    )}
                    {form.formState.errors.game.playtimeMax !== undefined ? (
                      <FormMessage className="flex-1">
                        {form.formState.errors.game.playtimeMax.message}
                      </FormMessage>
                    ) : (
                      <View />
                    )}
                  </View>
                )}

                {/* Year Published */}
                <View className="flex flex-row items-center gap-4">
                  <Label className="w-24">Year Published</Label>
                  <View className="flex-1">
                    <FormField
                      control={form.control}
                      name="game.yearPublished"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Year Published"
                              keyboardType="numeric"
                              onChangeText={onChangeNumberText(field.onChange)}
                              value={
                                field.value
                                  ? `${field.value.toString()}`
                                  : undefined
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </View>
                </View>
                {/* Error Message for Year Published */}
                {form.formState.errors.game?.yearPublished && (
                  <View className="flex flex-row items-center gap-4">
                    <View className="w-24" />
                    <FormMessage className="flex-1">
                      {form.formState.errors.game.yearPublished.message}
                    </FormMessage>
                  </View>
                )}
              </View>
              <Separator className="w-full" orientation="horizontal" />
              <View className="flex flex-col">
                <View className="flex flex-row items-center justify-between">
                  <Text className="text-xl font-semibold">Scoresheet</Text>
                  <Button
                    variant="default"
                    onPress={() => {
                      setOpenScoresheetModal(true);
                    }}
                  >
                    <Text>
                      {form.getValues("scoresheet") === null
                        ? "Create New"
                        : "Edit Sheet"}
                    </Text>
                  </Button>
                </View>
                <Button
                  variant="ghost"
                  size="lg"
                  className="flex flex-row items-center justify-between gap-2"
                  onPress={() => {
                    setOpenScoresheetModal(true);
                  }}
                >
                  <Table className="text-primary" size={30} strokeWidth={1.5} />
                  <View className="flex flex-grow flex-col items-start justify-start">
                    <Text className="text-lg">
                      {form.getValues("scoresheet")?.name ?? "Default"}
                    </Text>
                    <View className="mb-2 flex w-full flex-row items-center gap-3 text-sm">
                      <View className="flex min-w-20 flex-row items-center gap-1">
                        <Text>Win Condition:</Text>
                        <Text className="text-sm text-muted-foreground">
                          {form.getValues("scoresheet")?.winCondition ??
                            "Highest Score"}
                        </Text>
                      </View>
                      <Separator
                        orientation="vertical"
                        className="font-semi-bold h-4"
                      />
                      <View className="flex min-w-20 flex-row items-center gap-1">
                        <Text>Rounds:</Text>
                        <Text className="text-sm text-muted-foreground">
                          {form.getValues("scoresheet") !== null
                            ? form.getValues("rounds").length > 0
                              ? form.getValues("rounds").length
                              : "1"
                            : "1"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Button>
              </View>
            </CollapsibleContent>
          </Collapsible>
        </View>
        <DialogFooter className="gap-2">
          <Button variant="secondary" onPress={() => setIsOpen(false)}>
            <Text>Cancel</Text>
          </Button>
          <Button
            className="flex flex-row items-center gap-4"
            onPress={form.handleSubmit(onSubmit)}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <ActivityIndicator className="text-secondary" />
                <Text>Uploading...</Text>
              </>
            ) : (
              <Text>Submit</Text>
            )}
          </Button>
        </DialogFooter>
      </Form>
      <AddScoresheetModal
        isModalVisible={openScoresheetModal}
        setModalVisible={setOpenScoresheetModal}
        scoresheet={form.getValues("scoresheet")}
        rounds={form.getValues("rounds")}
        setScoresheet={(value: ScoreSheetType | null) =>
          form.setValue("scoresheet", value)
        }
        setRounds={(value: RoundsType) => form.setValue("rounds", value)}
      />
    </Fragment>
  );
}
