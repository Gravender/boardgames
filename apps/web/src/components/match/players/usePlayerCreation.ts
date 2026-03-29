"use client";

import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";

import { toast } from "@board-games/ui/toast";

import { useCreatePlayerMutation } from "~/hooks/mutations/player/create";
import { useTRPC } from "~/trpc/react";
import { useUploadThing } from "~/utils/uploadthing";

interface CreatedPlayer {
  id: number;
  name: string;
  image: { url: string | null } | null;
}

interface UsePlayerCreationArgs {
  onCreateSuccess: (player: CreatedPlayer) => void;
}

interface PlayerCreationValues {
  name: string;
  imageFile: File | null;
}

export const usePlayerCreation = ({
  onCreateSuccess,
}: UsePlayerCreationArgs) => {
  const { startUpload } = useUploadThing("imageUploader");
  const { createPlayerMutation } = useCreatePlayerMutation();
  const trpc = useTRPC();
  const deleteImageMutation = useMutation(trpc.image.delete.mutationOptions());
  const { mutateAsync: deleteImage } = deleteImageMutation;

  const rollbackUploadedImages = useCallback(
    async (uploadedImageIds: number[]) => {
      await Promise.all(
        uploadedImageIds.map((id) =>
          deleteImage({ id }).catch(() => undefined),
        ),
      );
    },
    [deleteImage],
  );

  const handleCreatePlayerWithoutImage = useCallback(
    async ({ name }: { name: string }) => {
      try {
        const player = await createPlayerMutation.mutateAsync({
          name,
          imageId: null,
        });
        onCreateSuccess(player);
      } catch {
        toast.error("Error", {
          description: "There was a problem creating the player.",
        });
      }
    },
    [createPlayerMutation, onCreateSuccess],
  );

  const handleCreatePlayerWithImage = useCallback(
    async ({ name, imageFile }: { name: string; imageFile: File }) => {
      let uploadedImageIds: number[] = [];

      try {
        const uploadResult = await startUpload([imageFile], {
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
        const player = await createPlayerMutation.mutateAsync({
          name,
          imageId,
        });
        onCreateSuccess(player);
      } catch {
        if (uploadedImageIds.length === 0) {
          toast.error("Error", {
            description: "There was a problem uploading your Image.",
          });
          return;
        }
        await rollbackUploadedImages(uploadedImageIds);
        toast.error("Error", {
          description: "There was a problem creating the player.",
        });
      }
    },
    [
      createPlayerMutation,
      onCreateSuccess,
      rollbackUploadedImages,
      startUpload,
    ],
  );

  const handleSubmit = useCallback(
    async ({ name, imageFile }: PlayerCreationValues) => {
      if (!imageFile) {
        await handleCreatePlayerWithoutImage({ name });
        return;
      }
      await handleCreatePlayerWithImage({ name, imageFile });
    },
    [handleCreatePlayerWithImage, handleCreatePlayerWithoutImage],
  );

  return { handleSubmit };
};
