"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod/v4";

import type { RouterInputs, RouterOutputs } from "@board-games/api";
import { insertPlayerSchema } from "@board-games/db/zodSchema";
import { fileSchema } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import { toast } from "@board-games/ui/toast";

import { Spinner } from "~/components/spinner";
import { useAppForm } from "~/hooks/form";
import { useUpdatePlayerMutation } from "~/hooks/mutations/player/update";
import { useTRPC } from "~/trpc/react";
import { useUploadThing } from "~/utils/uploadthing";

const originalPlayerSchema = insertPlayerSchema.pick({ name: true }).extend({
  imageUrl: fileSchema.or(z.string().nullable()),
});
const sharedPlayerSchema = insertPlayerSchema
  .pick({ name: true })
  .required({ name: true })
  .extend({
    imageUrl: fileSchema.or(z.string().nullable()),
  });

type ListPlayer = RouterOutputs["newPlayer"]["getPlayers"][number];

/** Minimal player shape for edit (list row or stats header). */
export type EditPlayerDialogPlayer =
  | Pick<
      Extract<ListPlayer, { type: "original" }>,
      "type" | "id" | "name" | "image"
    >
  | Pick<
      Extract<ListPlayer, { type: "shared" }>,
      "type" | "sharedPlayerId" | "name" | "image" | "permissions"
    >;

type OriginalPlayerType = Extract<EditPlayerDialogPlayer, { type: "original" }>;
type SharedPlayerType = Extract<EditPlayerDialogPlayer, { type: "shared" }>;
interface PlayerValues {
  name: string;
  imageUrl: File | string | null;
}
type UpdatePlayerInput = RouterInputs["player"]["update"];

const buildPlayerSchema = (
  player: EditPlayerDialogPlayer,
  initialImageUrl: string | null,
) => {
  return (
    player.type === "original" ? originalPlayerSchema : sharedPlayerSchema
  ).check((ctx) => {
    const nameUnchanged = ctx.value.name === player.name;
    const imageUnchanged = ctx.value.imageUrl === initialImageUrl;
    const hasNoChanges =
      player.type === "original"
        ? nameUnchanged && imageUnchanged
        : nameUnchanged;

    if (hasNoChanges) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        message: "No changes made.",
        path: player.type === "original" ? ["imageUrl"] : ["name"],
      });
    }
  });
};

const useUpdateOriginalPlayer = ({
  handleMutationSuccess,
}: {
  handleMutationSuccess: () => void;
}) => {
  const { updatePlayerMutation } = useUpdatePlayerMutation();

  const updateOriginalPlayer = async ({
    player,
    values,
    imageId,
  }: {
    player: OriginalPlayerType;
    values: PlayerValues;
    imageId: number | undefined;
  }) => {
    const nameChanged = values.name !== player.name;
    const imageIdChanged = imageId !== undefined;
    const clearImageRequested =
      values.imageUrl === null && player.image?.url != null;

    if (!nameChanged && !imageIdChanged && !clearImageRequested) {
      return;
    }

    if (nameChanged && imageIdChanged) {
      await updatePlayerMutation.mutateAsync({
        type: "original",
        id: player.id,
        updateValues: {
          type: "nameAndImageId",
          name: values.name,
          imageId,
        },
      });
      handleMutationSuccess();
      return;
    }

    if (imageIdChanged) {
      await updatePlayerMutation.mutateAsync({
        type: "original",
        id: player.id,
        updateValues: {
          type: "imageId",
          imageId,
        },
      });
      handleMutationSuccess();
      return;
    }

    if (clearImageRequested) {
      if (nameChanged) {
        const combinedUpdateInput: UpdatePlayerInput = {
          type: "original",
          id: player.id,
          updateValues: {
            type: "nameAndClearImage",
            name: values.name,
          },
        };
        await updatePlayerMutation.mutateAsync(combinedUpdateInput);
        handleMutationSuccess();
        return;
      }
      await updatePlayerMutation.mutateAsync({
        type: "original",
        id: player.id,
        updateValues: {
          type: "clearImage",
        },
      });
      handleMutationSuccess();
      return;
    }

    await updatePlayerMutation.mutateAsync({
      type: "original",
      id: player.id,
      updateValues: {
        type: "name",
        name: values.name,
      },
    });
    handleMutationSuccess();
  };

  return {
    updateOriginalPlayer,
    isOriginalUpdatePending: updatePlayerMutation.isPending,
  };
};

const useUpdateSharedPlayer = ({
  handleMutationSuccess,
}: {
  handleMutationSuccess: () => void;
}) => {
  const { updatePlayerMutation } = useUpdatePlayerMutation();

  const updateSharedPlayer = async ({
    player,
    values,
  }: {
    player: SharedPlayerType;
    values: PlayerValues;
  }) => {
    const nameChanged = values.name !== player.name;
    if (!nameChanged) {
      return;
    }
    await updatePlayerMutation.mutateAsync({
      type: "shared",
      id: player.sharedPlayerId,
      name: values.name,
    });
    handleMutationSuccess();
  };

  return {
    updateSharedPlayer,
    isSharedUpdatePending: updatePlayerMutation.isPending,
  };
};

const useHandleImageUploadAndUpdate = () => {
  const { startUpload } = useUploadThing("imageUploader");
  const trpc = useTRPC();
  const deleteImageMutation = useMutation(trpc.image.delete.mutationOptions());
  const { mutateAsync: deleteImage } = deleteImageMutation;

  const handleImageUploadAndUpdate = async ({
    player,
    values,
    onUpdate,
  }: {
    player: EditPlayerDialogPlayer;
    values: PlayerValues;
    onUpdate: (imageId: number | undefined) => Promise<void>;
  }) => {
    if (valueIsExistingImage(values.imageUrl, player.image?.url ?? null)) {
      await onUpdate(undefined);
      return;
    }
    if (!values.imageUrl || typeof values.imageUrl === "string") {
      await onUpdate(undefined);
      return;
    }
    if (!(values.imageUrl instanceof File)) {
      throw new Error("Expected imageUrl to be a File before uploading");
    }

    const uploadResult = await startUpload([values.imageUrl], {
      usageType: "player",
    });
    if (!uploadResult || uploadResult.length === 0) {
      throw new Error("Image upload failed");
    }

    const imageId = uploadResult[0]?.serverData.imageId;
    if (typeof imageId !== "number") {
      throw new Error("Image upload did not return an imageId");
    }
    try {
      await onUpdate(imageId);
    } catch (error) {
      try {
        await deleteImage({ id: imageId });
      } catch (cleanupError) {
        console.error("Failed to cleanup uploaded player image", cleanupError);
      }
      throw error;
    }
  };

  return { handleImageUploadAndUpdate };
};

const useEditPlayerSubmit = ({
  player,
  setIsSubmitting,
  handleMutationSuccess,
}: {
  player: EditPlayerDialogPlayer;
  setIsSubmitting: (isSubmitting: boolean) => void;
  handleMutationSuccess: () => void;
}) => {
  const { handleImageUploadAndUpdate } = useHandleImageUploadAndUpdate();
  const { updateOriginalPlayer, isOriginalUpdatePending } =
    useUpdateOriginalPlayer({
      handleMutationSuccess,
    });
  const { updateSharedPlayer, isSharedUpdatePending } = useUpdateSharedPlayer({
    handleMutationSuccess,
  });

  const handleSubmitValues = async (values: PlayerValues) => {
    setIsSubmitting(true);
    try {
      await handleImageUploadAndUpdate({
        player,
        values,
        onUpdate: async (imageId) => {
          if (player.type === "original") {
            await updateOriginalPlayer({
              player,
              values,
              imageId,
            });
            return;
          }
          await updateSharedPlayer({
            player,
            values,
          });
        },
      });
    } catch (error) {
      console.error("Error saving player:", error);
      toast.error("Error", {
        description: "There was a problem saving your changes.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    handleSubmitValues,
    isUpdatePending: isOriginalUpdatePending || isSharedUpdatePending,
  };
};

const useEditPlayerForm = ({
  player,
  initialImageUrl,
  handleSubmitValues,
}: {
  player: EditPlayerDialogPlayer;
  initialImageUrl: string | null;
  handleSubmitValues: (values: PlayerValues) => Promise<void>;
}) => {
  const playerSchema = buildPlayerSchema(player, initialImageUrl);

  return useAppForm({
    defaultValues:
      player.type === "original"
        ? {
            name: player.name,
            imageUrl: initialImageUrl as File | string | null,
          }
        : {
            name: player.name,
            imageUrl: null as File | string | null,
          },
    validators: {
      onSubmit: playerSchema,
    },
    onSubmit: async ({ value }) => {
      await handleSubmitValues(value);
    },
  });
};

const valueIsExistingImage = (
  imageUrl: PlayerValues["imageUrl"],
  currentImageUrl: string | null,
) => imageUrl === currentImageUrl;

/**
 * Edits both original and shared players.
 * Original players support name and image mutations through updateOriginalPlayer/updateSharedPlayer,
 * while handleImageUploadAndUpdate manages upload orchestration before applying updates.
 */
export const EditPlayerDialog = ({
  player,
  setOpen,
}: {
  player: EditPlayerDialogPlayer;
  setOpen: (isOpen: boolean) => void;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  return (
    <DialogContent
      className="sm:max-w-[465px]"
      onInteractOutside={(event) => {
        if (isSubmitting) {
          event.preventDefault();
        }
      }}
      onEscapeKeyDown={(event) => {
        if (isSubmitting) {
          event.preventDefault();
        }
      }}
    >
      <PlayerContent
        setOpen={setOpen}
        player={player}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
      />
    </DialogContent>
  );
};

const PlayerContent = ({
  setOpen,
  player,
  isSubmitting,
  setIsSubmitting,
}: {
  setOpen: (isOpen: boolean) => void;
  player: EditPlayerDialogPlayer;
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
}) => {
  const router = useRouter();
  const initialImageUrl = player.image?.url ?? null;

  const handleMutationSuccess = () => {
    router.refresh();
    form.reset();
    setOpen(false);
  };

  const { handleSubmitValues, isUpdatePending } = useEditPlayerSubmit({
    player,
    setIsSubmitting,
    handleMutationSuccess,
  });
  const form = useEditPlayerForm({
    player,
    initialImageUrl,
    handleSubmitValues,
  });

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }
    setOpen(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{`Edit ${player.name}`}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await form.handleSubmit();
        }}
        className="space-y-4"
      >
        <div className="flex flex-col gap-2">
          <form.AppField name="name">
            {(field) => (
              <field.TextField label="Player Name" placeholder="Player name" />
            )}
          </form.AppField>

          {player.type === "original" && (
            <form.AppField name="imageUrl">
              {(field) => (
                <field.FileField
                  label="Image"
                  description="Upload an image (max 4MB)."
                />
              )}
            </form.AppField>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="reset"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <form.Subscribe>
            {(state) => (
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  state.isSubmitting ||
                  !state.isDirty ||
                  isUpdatePending
                }
              >
                {isSubmitting || state.isSubmitting || isUpdatePending ? (
                  <>
                    <Spinner />
                    <span>Saving...</span>
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </form>
    </>
  );
};
