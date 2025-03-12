"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { insertPlayerSchema } from "@board-games/db/schema";
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
} from "@board-games/ui/form";
import { useToast } from "@board-games/ui/hooks/use-toast";
import { Input } from "@board-games/ui/input";

import { Spinner } from "~/components/spinner";
import { useAddMatchStore } from "~/providers/add-match-provider";
import { useTRPC } from "~/trpc/react";
import { useUploadThing } from "~/utils/uploadthing";

export const AddPlayerDialog = ({ gameId }: { gameId: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="min-h-80 sm:max-w-[465px]">
        <PlayerContent setOpen={setIsOpen} gameId={gameId} />
      </DialogContent>
      <div className="flex h-full w-full flex-col justify-end">
        <div className="flex justify-end">
          <DialogTrigger asChild>
            <Button
              variant="default"
              className="rounded-full"
              size="icon"
              type="button"
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
  imageUrl: z
    .instanceof(File)
    .refine((file) => file.size <= 4000000, `Max image size is 4MB.`)
    .refine(
      (file) => file.type === "image/jpeg" || file.type === "image/png",
      "Only .jpg and .png formats are supported.",
    )
    .nullable(),
});
const PlayerContent = ({
  setOpen,
  gameId,
}: {
  setOpen: (isOpen: boolean) => void;
  gameId: number;
}) => {
  const trpc = useTRPC();
  const { match, setPlayers } = useAddMatchStore((state) => state);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { toast } = useToast();
  const { startUpload } = useUploadThing("imageUploader");

  const queryClient = useQueryClient();
  const router = useRouter();

  const form = useForm<z.infer<typeof playerSchema>>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      name: "",
      imageUrl: null,
    },
  });
  const createPlayer = useMutation(
    trpc.player.create.mutationOptions({
      onSuccess: async (player) => {
        setIsUploading(false);
        setPlayers([...match.players, player]);
        await queryClient.invalidateQueries(
          trpc.player.getPlayers.queryOptions(),
        );
        await queryClient.invalidateQueries(
          trpc.player.getPlayersByGame.queryFilter({
            game: { id: gameId },
          }),
        );
        await queryClient.invalidateQueries(
          trpc.dashboard.getPlayers.queryOptions(),
        );
        setOpen(false);
        form.reset();
        router.refresh();
        toast({
          title: "Player created successfully!",
        });
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

      const uploadResult = await startUpload([imageFile]);
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
                        <User className="h-full w-full items-center justify-center rounded-full bg-muted p-2" />
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
