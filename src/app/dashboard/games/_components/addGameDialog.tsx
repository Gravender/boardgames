"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronUp, Dices, Plus, Table } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { NumberInput } from "~/components/number-input";
import { Spinner } from "~/components/spinner";
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
} from "~/components/ui/dialog";
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
import { useAddGameStore } from "~/providers/add-game-provider";
import { gameSchema } from "~/stores/add-game-store";
import { api } from "~/trpc/react";
import { useUploadThing } from "~/utils/uploadthing";

export function AddGameDialog() {
  const { isOpen, setIsOpen } = useAddGameStore((state) => state);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <Content />
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

function Content() {
  const {
    scoresheet,
    rounds,
    game,
    moreOptions,
    setMoreOptions,
    setGame,
    reset,
  } = useAddGameStore((state) => state);
  const [imagePreview, setImagePreview] = useState<string | null>(
    game.gameImg ? URL.createObjectURL(game.gameImg) : null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { startUpload } = useUploadThing("imageUploader");
  const router = useRouter();

  const utils = api.useUtils();

  const form = useForm<z.infer<typeof gameSchema>>({
    resolver: zodResolver(gameSchema),
    defaultValues: game,
  });

  const createGame = api.game.create.useMutation({
    onSuccess: async () => {
      setIsUploading(false);
      reset();
      await utils.game.invalidate();
      router.refresh();
      form.reset();
      toast({
        title: "Game created successfully!",
        description: "Your data has been uploaded.",
      });
    },
  });
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);
  async function onSubmit(values: z.infer<typeof gameSchema>) {
    setIsUploading(true);
    if (!values.gameImg) {
      createGame.mutate({
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
        scoresheet: scoresheet,
        rounds: rounds,
      });
      return;
    }

    try {
      const imageFile = values.gameImg;

      const uploadResult = await startUpload([imageFile]);
      if (!uploadResult) {
        throw new Error("Image upload failed");
      }

      toast({
        title: "File Upload Successful!",
        description: "Your File has been stored",
      });

      const imageId = uploadResult[0]
        ? uploadResult[0].serverData.imageId
        : null;

      createGame.mutate({
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
        scoresheet: scoresheet,
        rounds: rounds,
      });
      form.reset();
      setImagePreview(null); // Clear the image preview
    } catch (error) {
      console.error("Error uploading Image:", error);
      toast({
        title: "Error",
        description: "There was a problem uploading your Image.",
        variant: "destructive",
      });
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Game</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                    <div className="relative flex shrink-0 overflow-hidden rounded-full h-20 w-20">
                      {imagePreview ? (
                        <Image
                          src={imagePreview}
                          alt="Game image"
                          className="rounded-sm aspect-square h-full w-full"
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
                            value={
                              field.value !== null ? field.value : undefined
                            }
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
                            value={
                              field.value !== null ? field.value : undefined
                            }
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
                            value={
                              field.value !== null ? field.value : undefined
                            }
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
                            value={
                              field.value !== null ? field.value : undefined
                            }
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
                            value={
                              field.value !== null ? field.value : undefined
                            }
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
                      router.push("/dashboard/games/add/scoresheet");
                    }}
                    type="button"
                  >
                    {scoresheet === null ? "Create New" : "Edit Sheet"}
                  </Button>
                </div>
                <button
                  className="flex items-center justify-between gap-2"
                  onClick={() => {
                    setGame(form.getValues());
                    router.push("/dashboard/games/add/scoresheet");
                  }}
                  type="button"
                >
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
                </button>
              </div>
            </CollapsibleContent>
          </Collapsible>
          <DialogFooter className="gap-2">
            <Button type="reset" variant="secondary" onClick={() => reset()}>
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
    </>
  );
}