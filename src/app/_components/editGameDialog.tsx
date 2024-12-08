"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronUp, Dices, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
  DialogTrigger,
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
import { useToast } from "~/hooks/use-toast";
import { api, type RouterInputs } from "~/trpc/react";
import { useUploadThing } from "~/utils/uploadthing";

const formSchema = z
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
      .nullable()
      .or(z.string().nullable()),
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

export function EditGameDialog({
  game,
  setOpen,
  isOpen,
}: {
  game: RouterInputs["game"]["updateGame"] & { image: string | null };
  setOpen: (isOpen: boolean) => void;
  isOpen: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <Content game={game} setOpen={setOpen} />
      </DialogContent>
    </Dialog>
  );
}

function Content({
  game,
  setOpen,
}: {
  game: RouterInputs["game"]["updateGame"] & { image: string | null };
  setOpen: (isOpen: boolean) => void;
}) {
  const [imagePreview, setImagePreview] = useState<string | null>(
    game.image ?? null,
  );
  const [openCollapse, setOpenCollapse] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { startUpload } = useUploadThing("imageUploader");
  const router = useRouter();

  const utils = api.useUtils();
  const mutation = api.game.updateGame.useMutation({
    onSuccess: async () => {
      await utils.game.getGames.invalidate();
      router.refresh();
      toast({
        title: "Game updated successfully!",
      });
      form.reset();
      setImagePreview(null);
      setOpen(false);
    },
  });

  const updateGame = ({
    imageId,
    values,
  }: {
    imageId: number | null | undefined;
    values: z.infer<typeof formSchema>;
  }) => {
    const nameChanged = values.name !== game.name;
    const ownedByChanged = values.ownedBy !== game.ownedBy;
    const playersMinChanged = values.playersMin !== game.playersMin;
    const playersMaxChanged = values.playersMax !== game.playersMax;
    const playtimeMinChanged = values.playtimeMin !== game.playtimeMin;
    const playtimeMaxChanged = values.playtimeMax !== game.playtimeMax;
    const yearPublishedChanged = values.yearPublished !== game.yearPublished;
    const imageIdChanged = imageId !== undefined;

    if (
      nameChanged ||
      ownedByChanged ||
      playersMinChanged ||
      playersMaxChanged ||
      playtimeMinChanged ||
      playtimeMaxChanged ||
      yearPublishedChanged ||
      imageIdChanged
    ) {
      mutation.mutate({
        id: game.id,

        name: nameChanged ? values.name : undefined,
        ownedBy: ownedByChanged ? values.ownedBy : undefined,
        playersMin: playersMinChanged ? values.playersMin : undefined,
        playersMax: playersMaxChanged ? values.playersMax : undefined,
        playtimeMin: playtimeMinChanged ? values.playtimeMin : undefined,
        playtimeMax: playtimeMaxChanged ? values.playtimeMax : undefined,
        yearPublished: yearPublishedChanged ? values.yearPublished : undefined,
        imageId: imageId,
      });
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: game.name,
      ownedBy: game.ownedBy ?? false,
      gameImg: game.image,
      playersMin: game.playersMin,
      playersMax: game.playersMax,
      playtimeMin: game.playtimeMin,
      playtimeMax: game.playtimeMax,
      yearPublished: game.yearPublished,
    },
  });
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsUploading(true);
    if (values.gameImg === game.image) {
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
    <>
      <DialogHeader>
        <DialogTitle>{`Edit ${game.name}`}</DialogTitle>
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
                    <div className="relative flex shrink-0 overflow-hidden h-20 w-20">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Game image"
                          className="rounded-sm aspect-square h-full w-full"
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
          <Collapsible open={openCollapse} onOpenChange={setOpenCollapse}>
            <CollapsibleTrigger asChild>
              <Button className="pl-0" variant="ghost" size="sm">
                <span>More options</span>
                {openCollapse ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4">
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
                          value={field.value !== null ? field.value : undefined}
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
                          value={field.value !== null ? field.value : undefined}
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
                          value={field.value !== null ? field.value : undefined}
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
                          value={field.value !== null ? field.value : undefined}
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
                          value={field.value !== null ? field.value : undefined}
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
            </CollapsibleContent>
          </Collapsible>
          <DialogFooter>
            <Button
              type="reset"
              variant="secondary"
              onClick={() => setOpen(false)}
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
    </>
  );
}
