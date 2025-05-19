"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { RouterOutputs } from "@board-games/api";
import { insertPlayerSchema } from "@board-games/db/zodSchema";
import { Button } from "@board-games/ui/button";
import {
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

import { Spinner } from "~/components/spinner";
import { useTRPC } from "~/trpc/react";
import { useUploadThing } from "~/utils/uploadthing";

const imageSchema = z
  .instanceof(File)
  .refine((file) => file.size <= 4000000, `Max image size is 4MB.`)
  .refine(
    (file) => file.type === "image/jpeg" || file.type === "image/png",
    "Only .jpg and .png formats are supported.",
  )
  .nullable();
const originalPlayerSchema = insertPlayerSchema.pick({ name: true }).extend({
  imageUrl: imageSchema.or(z.string().nullable()),
});
const sharedPlayerSchema = insertPlayerSchema
  .pick({ name: true })
  .required({ name: true })
  .extend({
    imageUrl: imageSchema.or(z.string().nullable()),
  });
export const EditPlayerDialog = ({
  player,
  setOpen,
}: {
  player: RouterOutputs["player"]["getPlayers"][number];
  setOpen: (isOpen: boolean) => void;
}) => {
  return (
    <DialogContent className="sm:max-w-[465px]">
      <PlayerContent setOpen={setOpen} player={player} />
    </DialogContent>
  );
};

const PlayerContent = ({
  setOpen,
  player,
}: {
  setOpen: (isOpen: boolean) => void;
  player: RouterOutputs["player"]["getPlayers"][number];
}) => {
  const trpc = useTRPC();
  const [imagePreview, setImagePreview] = useState<string | null>(
    player.imageUrl ?? null,
  );
  const [isUploading, setIsUploading] = useState(false);

  const { toast } = useToast();
  const { startUpload } = useUploadThing("imageUploader");

  const queryClient = useQueryClient();
  const router = useRouter();

  const playerSchema =
    player.type === "original"
      ? originalPlayerSchema
      : sharedPlayerSchema.superRefine((values, ctx) => {
          if (values.name === player.name)
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Name has not changed.",
              path: ["name"],
            });
        });

  const form = useForm<z.infer<typeof playerSchema>>({
    resolver: zodResolver(playerSchema),
    defaultValues:
      player.type === "original"
        ? {
            name: player.name,
            imageUrl: player.imageUrl,
          }
        : {
            name: player.name,
            imageUrl: null,
          },
  });
  const mutation = useMutation(
    trpc.player.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.player.getPlayers.queryOptions(),
        );
        await queryClient.invalidateQueries(
          trpc.player.getPlayer.queryOptions({ id: player.id }),
        );
        await queryClient.invalidateQueries(
          trpc.dashboard.getPlayers.queryOptions(),
        );
        router.refresh();
        toast({
          title: "Player updated successfully!",
        });
        form.reset();
        setImagePreview(null);
        setOpen(false);
      },
    }),
  );
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const updatePlayer = ({
    imageId,
    values,
  }: {
    imageId: number | null | undefined;
    values: z.infer<typeof playerSchema>;
  }) => {
    const nameChanged = values.name !== player.name;
    const imageIdChanged = imageId !== undefined;
    if (player.type === "original" && (nameChanged || imageIdChanged)) {
      mutation.mutate({
        type: "original" as const,
        id: player.id,
        name: nameChanged ? values.name : undefined,
        imageId: imageId,
      });
    }
    if (player.type === "shared" && nameChanged) {
      mutation.mutate({
        type: "shared" as const,
        id: player.id,
        name: values.name,
      });
    }
  };

  async function onSubmit(values: z.infer<typeof playerSchema>) {
    setIsUploading(true);
    if (values.imageUrl === player.imageUrl) {
      setIsUploading(false);
      updatePlayer({ imageId: undefined, values });
      return;
    }
    if (!values.imageUrl) {
      setIsUploading(false);
      updatePlayer({ imageId: null, values });
      return;
    }

    try {
      const imageFile = values.imageUrl as File;

      const uploadResult = await startUpload([imageFile]);
      if (!uploadResult) {
        throw new Error("Image upload failed");
      }

      const imageId = uploadResult[0]
        ? uploadResult[0].serverData.imageId
        : null;

      updatePlayer({ values, imageId: imageId });
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
        <DialogTitle>{`Edit ${player.name}`}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col gap-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Player Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Player name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {player.type === "original" && (
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-4">
                        <div className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded-full">
                          {imagePreview ? (
                            <Image
                              src={imagePreview}
                              alt="Player image"
                              className="aspect-square h-full w-full rounded-sm object-cover"
                              fill
                            />
                          ) : (
                            <User className="h-full w-full items-center justify-center rounded-full bg-muted p-2" />
                          )}
                        </div>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (imagePreview) {
                              URL.revokeObjectURL(imagePreview);
                            }
                            field.onChange(file);
                            if (file) {
                              const url = URL.createObjectURL(file);
                              setImagePreview(url);
                            }
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Upload an image (max 4MB).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="reset"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isUploading || !form.formState.isDirty || mutation.isPending
              }
            >
              {isUploading || mutation.isPending ? (
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
};
