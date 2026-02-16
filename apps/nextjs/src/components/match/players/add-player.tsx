"use client";

import type { z } from "zod/v4";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import { User } from "lucide-react";

import { insertPlayerSchema } from "@board-games/db/zodSchema";
import { fileSchema } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import {
  DialogDescription,
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
  useForm,
} from "@board-games/ui/form";
import { Input } from "@board-games/ui/input";
import { toast } from "@board-games/ui/toast";

import { Spinner } from "~/components/spinner";
import { useInvalidatePlayers } from "~/hooks/invalidate/player";
import { useTRPC } from "~/trpc/react";
import { useUploadThing } from "~/utils/uploadthing";

const addPlayerSchema = insertPlayerSchema.pick({ name: true }).extend({
  imageUrl: fileSchema,
});
export const AddPlayerForm = ({
  addMatchPlayer,
  cancel,
}: {
  addMatchPlayer: (player: {
    id: number;
    imageUrl: string;
    name: string;
  }) => void;
  cancel: () => void;
}) => {
  const trpc = useTRPC();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { startUpload } = useUploadThing("imageUploader");

  const invalidatePlayers = useInvalidatePlayers();

  const form = useForm({
    schema: addPlayerSchema,
    defaultValues: {
      name: "",
      imageUrl: null,
    },
  });
  const createPlayer = useMutation(
    trpc.player.create.mutationOptions({
      onSuccess: async (player) => {
        setIsUploading(false);
        await Promise.all([...invalidatePlayers()]);
        addMatchPlayer({
          id: player.id,
          imageUrl: player.image?.url ?? "",
          name: player.name,
        });
        toast("Player created successfully!");
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

  async function onSubmit(values: z.infer<typeof addPlayerSchema>) {
    setIsUploading(true);
    if (!values.imageUrl) {
      createPlayer.mutate({
        name: values.name,
        imageId: null,
      });
      return;
    }

    try {
      const imageFile = values.imageUrl;

      const uploadResult = await startUpload([imageFile], {
        usageType: "player",
      });
      if (!uploadResult) {
        throw new Error("Image upload failed");
      }

      const imageId = uploadResult[0]
        ? uploadResult[0].serverData.imageId
        : null;

      createPlayer.mutate({
        name: values.name,
        imageId: imageId,
      });
      form.reset();
      setImagePreview(null); // Clear the image preview
    } catch (error) {
      setIsUploading(false);
      console.error("Error uploading Image:", error);
      toast.error("Error", {
        description: "There was a problem uploading your Image.",
      });
    }
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add New Player</DialogTitle>
        <DialogDescription>
          Create a new player to add to your match.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                        <User className="bg-muted h-full w-full items-center justify-center rounded-full p-2" />
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
          <DialogFooter className="gap-2">
            <Button type="reset" variant="secondary" onClick={() => cancel()}>
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
};
