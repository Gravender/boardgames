"use client";

import type { z } from "zod/v4";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { PlusIcon, User } from "lucide-react";

import { insertPlayerSchema } from "@board-games/db/zodSchema";
import { fileSchema } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

export const AddPlayerDialog = ({
  defaultIsOpen = false,
}: {
  defaultIsOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultIsOpen);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="min-h-80 sm:max-w-[465px]">
        <PlayerContent setOpen={setIsOpen} />
      </DialogContent>
      <div className="flex h-full w-full flex-col justify-end">
        <div className="flex justify-end">
          <DialogTrigger asChild>
            <Button
              variant="default"
              className="rounded-full"
              size="icon"
              type="button"
              aria-label="add player"
            >
              <PlusIcon />
            </Button>
          </DialogTrigger>
        </div>
      </div>
    </Dialog>
  );
};

const playerSchema = insertPlayerSchema.pick({ name: true }).extend({
  imageUrl: fileSchema,
});
const PlayerContent = ({ setOpen }: { setOpen: (isOpen: boolean) => void }) => {
  const trpc = useTRPC();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { startUpload } = useUploadThing("imageUploader");

  const router = useRouter();
  const playersInvalidate = useInvalidatePlayers();

  const form = useForm({
    schema: playerSchema,
    defaultValues: {
      name: "",
      imageUrl: null,
    },
  });
  const createPlayer = useMutation(
    trpc.player.create.mutationOptions({
      onSuccess: async () => {
        setIsUploading(false);
        await Promise.all(playersInvalidate());
        setOpen(false);
        form.reset();
        router.refresh();
        toast.success("Player created successfully!");
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

  async function onSubmit(values: z.infer<typeof playerSchema>) {
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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const imageId = uploadResult[0]
        ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          uploadResult[0].serverData.imageId
        : null;

      createPlayer.mutate({
        name: values.name,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        imageId: imageId,
      });
      form.reset();
      setImagePreview(null); // Clear the image preview
    } catch (error) {
      console.error("Error uploading Image:", error);
      toast.error("Error", {
        description: "There was a problem uploading your Image.",
      });
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Player</DialogTitle>
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
};
