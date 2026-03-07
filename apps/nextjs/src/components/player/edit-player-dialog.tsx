"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
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
export const EditPlayerDialog = ({
  player,
  setOpen,
}: {
  player: RouterOutputs["player"]["getPlayers"][number];
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
  player: RouterOutputs["player"]["getPlayers"][number];
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
}) => {
  const { startUpload } = useUploadThing("imageUploader");
  const router = useRouter();
  const { updatePlayerMutation } = useUpdatePlayerMutation();
  const initialImageUrl = player.image?.url ?? null;

  const playerSchema = (
    player.type === "original" ? originalPlayerSchema : sharedPlayerSchema
  ).check((ctx) => {
    const nameUnchanged = ctx.value.name === player.name;
    const imageUnchanged = ctx.value.imageUrl === initialImageUrl;
    const hasNoChanges =
      player.type === "original"
        ? nameUnchanged && imageUnchanged
        : nameUnchanged;

    if (hasNoChanges)
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        message: "No changes made.",
        path: player.type === "original" ? ["imageUrl"] : ["name"],
      });
  });

  const handleMutationSuccess = () => {
    router.refresh();
    form.reset();
    setOpen(false);
  };

  const updatePlayer = async ({
    imageId,
    values,
  }: {
    imageId: number | undefined;
    values: { name: string; imageUrl: File | string | null };
  }) => {
    const nameChanged = values.name !== player.name;
    const imageIdChanged = imageId !== undefined;
    if (player.type === "original" && (nameChanged || imageIdChanged)) {
      if (nameChanged && imageIdChanged) {
        await updatePlayerMutation.mutateAsync({
          type: "original" as const,
          id: player.id,
          updateValues: {
            type: "nameAndImageId",
            name: values.name,
            imageId,
          },
        });
      } else if (imageIdChanged) {
        await updatePlayerMutation.mutateAsync({
          type: "original" as const,
          id: player.id,
          updateValues: {
            type: "imageId",
            imageId,
          },
        });
      } else if (nameChanged) {
        await updatePlayerMutation.mutateAsync({
          type: "original" as const,
          id: player.id,
          updateValues: {
            type: "name",
            name: values.name,
          },
        });
      }
      handleMutationSuccess();
      return;
    }
    if (player.type === "shared" && nameChanged) {
      await updatePlayerMutation.mutateAsync({
        type: "shared" as const,
        id: player.id,
        name: values.name,
      });
      handleMutationSuccess();
    }
  };

  const form = useAppForm({
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
      setIsSubmitting(true);
      try {
        if (value.imageUrl === player.image?.url) {
          await updatePlayer({ imageId: undefined, values: value });
          return;
        }
        if (!value.imageUrl) {
          await updatePlayer({ imageId: undefined, values: value });
          return;
        }
        if (typeof value.imageUrl === "string") {
          await updatePlayer({ imageId: undefined, values: value });
          return;
        }
        if (!(value.imageUrl instanceof File)) {
          throw new Error("Expected imageUrl to be a File before uploading");
        }

        const uploadResult = await startUpload([value.imageUrl], {
          usageType: "player",
        });
        if (!uploadResult || uploadResult.length === 0) {
          throw new Error("Image upload failed");
        }

        const imageId = uploadResult[0]?.serverData.imageId;
        if (typeof imageId !== "number") {
          throw new Error("Image upload did not return an imageId");
        }

        await updatePlayer({ values: value, imageId });
      } catch (error) {
        console.error("Error uploading Image:", error);
        toast.error("Error", {
          description: "There was a problem uploading your Image.",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
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
          <form.Subscribe
            selector={(state) => ({
              isSubmitting: state.isSubmitting,
              isDirty: state.isDirty,
            })}
          >
            {({ isSubmitting: formIsSubmitting, isDirty }) => (
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  formIsSubmitting ||
                  !isDirty ||
                  updatePlayerMutation.isPending
                }
              >
                {isSubmitting ||
                formIsSubmitting ||
                updatePlayerMutation.isPending ? (
                  <>
                    <Spinner />
                    <span>Uploading...</span>
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
