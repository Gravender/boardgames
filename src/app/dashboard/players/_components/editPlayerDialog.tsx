"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Spinner } from "~/components/spinner";
import { Button } from "~/components/ui/button";
import {
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
import { useToast } from "~/hooks/use-toast";
import { insertPlayerSchema } from "~/server/db/schema";
import { api, type RouterOutputs } from "~/trpc/react";
import { useUploadThing } from "~/utils/uploadthing";

export const EditPlayerDialog = ({
  player,
  setOpen,
}: {
  player: RouterOutputs["player"]["getPlayers"][number];
  setOpen: (isOpen: boolean) => void;
}) => {
  return (
    <DialogContent className="sm:max-w-[465px] min-h-80">
      <PlayerContent setOpen={setOpen} player={player} />
    </DialogContent>
  );
};

const playerSchema = insertPlayerSchema.pick({ name: true }).extend({
  imageUrl: z
    .instanceof(File)
    .refine((file) => file.size <= 4000000, `Max image size is 4MB.`)
    .refine(
      (file) => file.type === "image/jpeg" || file.type === "image/png",
      "Only .jpg and .png formats are supported.",
    )
    .nullable()
    .or(z.string().nullable()),
});
const PlayerContent = ({
  setOpen,
  player,
}: {
  setOpen: (isOpen: boolean) => void;
  player: RouterOutputs["player"]["getPlayers"][number];
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(
    player.imageUrl ?? null,
  );
  const [isUploading, setIsUploading] = useState(false);

  const { toast } = useToast();
  const { startUpload } = useUploadThing("imageUploader");

  const utils = api.useUtils();
  const router = useRouter();

  const form = useForm<z.infer<typeof playerSchema>>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      name: player.name,
      imageUrl: player.imageUrl,
    },
  });
  const mutation = api.player.update.useMutation({
    onSuccess: async () => {
      await utils.player.getPlayers.invalidate();
      await utils.player.getPlayer.invalidate({ id: player.id });
      router.refresh();
      toast({
        title: "Player updated successfully!",
      });
      form.reset();
      setImagePreview(null);
      setOpen(false);
    },
  });
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
    if (nameChanged || imageIdChanged) {
      mutation.mutate({
        id: player.id,
        name: nameChanged ? values.name : undefined,
        imageId: imageId,
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
  console.log(form.formState);
  return (
    <>
      <DialogHeader>
        <DialogTitle>{`Edit ${player.name}`}</DialogTitle>
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
                    <div className="relative flex shrink-0 overflow-hidden rounded-full h-20 w-20">
                      {imagePreview ? (
                        <Image
                          src={imagePreview}
                          alt="Player image"
                          className="rounded-sm aspect-square h-full w-full object-cover"
                          fill
                        />
                      ) : (
                        <User className="h-full w-full p-2 items-center justify-center bg-muted rounded-full" />
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
            <Button
              type="submit"
              disabled={isUploading || !form.formState.isDirty}
            >
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
