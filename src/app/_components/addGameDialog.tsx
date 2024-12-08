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
import { insertScoreSheetSchema } from "~/server/db/schema";
import { insertRoundSchema } from "~/server/db/schema/round";
import { api } from "~/trpc/react";
import { useUploadThing } from "~/utils/uploadthing";

import { AddScoreSheet } from "./addScoreSheet";

const scoresheetSchema = insertScoreSheetSchema
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

export const addGameSchema = z
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
  })
  .and(
    z.object({
      scoresheet: scoresheetSchema.or(z.null()),
      rounds: roundsSchema,
    }),
  );

export function AddGameDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <Content setOpen={setIsOpen} />
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

function Content({ setOpen }: { setOpen: (isOpen: boolean) => void }) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [openCollapse, setOpenCollapse] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { startUpload } = useUploadThing("imageUploader");
  const router = useRouter();

  const utils = api.useUtils();

  const form = useForm<z.infer<typeof addGameSchema>>({
    resolver: zodResolver(addGameSchema),
    defaultValues: {
      name: "",
      ownedBy: false,
      gameImg: null,
      playersMin: null,
      playersMax: null,
      playtimeMin: null,
      playtimeMax: null,
      yearPublished: null,
      scoresheet: null,
      rounds: [],
    },
  });

  const createGame = api.game.create.useMutation({
    onSuccess: async () => {
      setIsUploading(false);
      await utils.game.invalidate();
      router.refresh();
      setOpen(false);
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
  async function onSubmit(values: z.infer<typeof addGameSchema>) {
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
        scoresheet: values.scoresheet,
        rounds: values.rounds,
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
        scoresheet: values.scoresheet,
        rounds: values.rounds,
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
          <Separator className="w-full" orientation="horizontal" />
          <AddScoreSheet form={form} />
          <DialogFooter className="gap-2">
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
