"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Spinner } from "~/components/spinner";
import { Button } from "~/components/ui/button";
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
import { useToast } from "~/hooks/use-toast";
import { insertPlayerSchema } from "~/server/db/schema";
import { api } from "~/trpc/react";
import { useUploadThing } from "~/utils/uploadthing";

export const AddPlayerDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[465px] min-h-80">
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
const PlayerContent = ({ setOpen }: { setOpen: (isOpen: boolean) => void }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { toast } = useToast();
  const { startUpload } = useUploadThing("imageUploader");

  const utils = api.useUtils();
  const router = useRouter();

  const form = useForm<z.infer<typeof playerSchema>>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      name: "",
      imageUrl: null,
    },
  });
  const createPlayer = api.player.create.useMutation({
    onSuccess: async () => {
      setIsUploading(false);
      await utils.player.getPlayers.invalidate();
      setOpen(false);
      form.reset();
      router.refresh();
      toast({
        title: "Player created successfully!",
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
                          className="rounded-sm aspect-square h-full w-full"
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
