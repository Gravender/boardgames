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

  const showCreatePlayerErrorToast = () => {
    toast.error("Error", {
      description: "There was a problem creating the player.",
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
        await handleCreatePlayerWithoutImage({ name: value.name });
        return;
      }
      await handleCreatePlayerWithImage({
        name: value.name,
        imageUrl: value.imageUrl,
      });
    },
  });

  const handleCreatePlayerSuccess = (player: {
    id: number;
    name: string;
    image: { url: string | null } | null;
  }) => {
    addMatchPlayer({
      id: player.id,
      imageUrl: player.image?.url ?? "",
      name: player.name,
    });
    form.reset();
  };

  const rollbackUploadedImages = async (uploadedImageIds: number[]) => {
    await Promise.all(
      uploadedImageIds.map((id) =>
        deleteImageMutation.mutateAsync({ id }).catch(() => undefined),
      ),
    );
  };

  const handleCreatePlayerWithoutImage = async ({ name }: { name: string }) => {
    try {
      const player = await createPlayerMutation.mutateAsync({ name, imageId: null });
      handleCreatePlayerSuccess(player);
    } catch {
      showCreatePlayerErrorToast();
    }
  };

  const handleCreatePlayerWithImage = async ({
    name,
    imageUrl,
  }: {
    name: string;
    imageUrl: File;
  }) => {
    let uploadedImageIds: number[] = [];

    try {
      const uploadResult = await startUpload([imageUrl], {
        usageType: "player",
      });
      if (!uploadResult) {
        throw new Error("Image upload failed");
      }
      uploadedImageIds = uploadResult
        .map((result) => result.serverData.imageId)
        .filter((imageId): imageId is number => typeof imageId === "number");

      const imageId = uploadedImageIds[0];
      if (imageId === undefined) {
        throw new Error("Image upload did not return an imageId");
      }
      const player = await createPlayerMutation.mutateAsync({ name, imageId });
      handleCreatePlayerSuccess(player);
    } catch {
      if (uploadedImageIds.length === 0) {
        showUploadErrorToast();
        return;
      }

      await rollbackUploadedImages(uploadedImageIds);
      showCreatePlayerErrorToast();
    }
  };

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
