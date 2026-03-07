"use client";

import { useMutation } from "@tanstack/react-query";

import { insertPlayerSchema } from "@board-games/db/zodSchema";
import { fileSchema } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import { toast } from "@board-games/ui/toast";

import { useAppForm } from "~/hooks/form";
import { useCreatePlayerMutation } from "~/hooks/mutations/player/create";
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
  const { startUpload } = useUploadThing("imageUploader");
  const trpc = useTRPC();
  const { createPlayerMutation } = useCreatePlayerMutation();
  const deleteImageMutation = useMutation(trpc.image.delete.mutationOptions());

  const showUploadErrorToast = () => {
    toast.error("Error", {
      description: "There was a problem uploading your Image.",
    });
  };

  const form = useAppForm({
    defaultValues: {
      name: "",
      imageUrl: null as File | null,
    },
    validators: {
      onSubmit: addPlayerSchema,
    },
    onSubmit: async ({ value }) => {
      if (!value.imageUrl) {
        createPlayerMutation.mutate(
          { name: value.name, imageId: null },
          {
            onSuccess: (player) => {
              addMatchPlayer({
                id: player.id,
                imageUrl: player.image?.url ?? "",
                name: player.name,
              });
              form.reset();
            },
          },
        );
        return;
      }

      try {
        const uploadResult = await startUpload([value.imageUrl], {
          usageType: "player",
        });
        if (!uploadResult) {
          throw new Error("Image upload failed");
        }
        const uploadedImageIds = uploadResult
          .map((result) => result.serverData.imageId)
          .filter((imageId): imageId is number => typeof imageId === "number");

        const imageId = uploadedImageIds[0];
        if (imageId === undefined) {
          throw new Error("Image upload did not return an imageId");
        }

        createPlayerMutation.mutate(
          { name: value.name, imageId },
          {
            onSuccess: (player) => {
              addMatchPlayer({
                id: player.id,
                imageUrl: player.image?.url ?? "",
                name: player.name,
              });
              form.reset();
            },
            onError: () => {
              void Promise.all(
                uploadedImageIds.map((id) =>
                  deleteImageMutation
                    .mutateAsync({ id })
                    .catch(() => undefined),
                ),
              );
              showUploadErrorToast();
            },
          },
        );
      } catch {
        showUploadErrorToast();
      }
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add New Player</DialogTitle>
        <DialogDescription>
          Create a new player to add to your match.
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await form.handleSubmit();
        }}
        className="space-y-8"
      >
        <form.AppField name="name">
          {(field) => (
            <field.TextField label="Player Name" placeholder="Player name" />
          )}
        </form.AppField>

        <form.AppField name="imageUrl">
          {(field) => (
            <field.FileField
              label="Image"
              description="Upload an image (max 4MB)."
            />
          )}
        </form.AppField>

        <DialogFooter className="gap-2">
          <Button type="reset" variant="secondary" onClick={() => cancel()}>
            Cancel
          </Button>
          <form.AppForm>
            <form.SubscribeButton label="Submit" />
          </form.AppForm>
        </DialogFooter>
      </form>
    </>
  );
};
