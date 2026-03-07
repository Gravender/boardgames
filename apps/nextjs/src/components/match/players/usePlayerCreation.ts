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
  imageUrl: File | null;
}

export const usePlayerCreation = ({
  onCreateSuccess,
}: UsePlayerCreationArgs) => {
  const { startUpload } = useUploadThing("imageUploader");
  const { createPlayerMutation } = useCreatePlayerMutation();
  const trpc = useTRPC();
  const deleteImageMutation = useMutation(trpc.image.delete.mutationOptions());

  const showUploadErrorToast = useCallback(() => {
    toast.error("Error", {
      description: "There was a problem uploading your Image.",
    });
  }, []);

  const showCreatePlayerErrorToast = useCallback(() => {
    toast.error("Error", {
      description: "There was a problem creating the player.",
    });
  }, []);

  const rollbackUploadedImages = useCallback(
    async (uploadedImageIds: number[]) => {
      await Promise.all(
        uploadedImageIds.map((id) =>
          deleteImageMutation.mutateAsync({ id }).catch(() => undefined),
        ),
      );
    },
    [deleteImageMutation],
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
        showCreatePlayerErrorToast();
      }
    },
    [createPlayerMutation, onCreateSuccess, showCreatePlayerErrorToast],
  );

  const handleCreatePlayerWithImage = useCallback(
    async ({ name, imageUrl }: { name: string; imageUrl: File }) => {
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
        const player = await createPlayerMutation.mutateAsync({
          name,
          imageId,
        });
        onCreateSuccess(player);
      } catch {
        if (uploadedImageIds.length === 0) {
          showUploadErrorToast();
          return;
        }
        await rollbackUploadedImages(uploadedImageIds);
        showCreatePlayerErrorToast();
      }
    },
    [
      createPlayerMutation,
      onCreateSuccess,
      rollbackUploadedImages,
      showCreatePlayerErrorToast,
      showUploadErrorToast,
      startUpload,
    ],
  );

  const handleSubmit = useCallback(
    async ({ name, imageUrl }: PlayerCreationValues) => {
      if (!imageUrl) {
        await handleCreatePlayerWithoutImage({ name });
        return;
      }
      await handleCreatePlayerWithImage({ name, imageUrl });
    },
    [handleCreatePlayerWithImage, handleCreatePlayerWithoutImage],
  );

  return { handleSubmit };
};
