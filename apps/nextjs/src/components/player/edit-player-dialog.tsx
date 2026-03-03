"use client";

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
  return (
    <DialogContent className="sm:max-w-[465px]">
      <PlayerContent setOpen={setOpen} player={player} />
    </DialogContent>
  );
};

const PlayerContent = ({
  setOpen,
  player,
}: {
  setOpen: (isOpen: boolean) => void;
  player: RouterOutputs["player"]["getPlayers"][number];
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

  const updatePlayer = ({
    imageId,
    values,
  }: {
    imageId: number | null | undefined;
    values: { name: string; imageUrl: File | string | null };
  }) => {
    const nameChanged = values.name !== player.name;
    const imageIdChanged = imageId !== undefined;
    if (player.type === "original" && (nameChanged || imageIdChanged)) {
      updatePlayerMutation.mutate(
        {
          type: "original" as const,
          id: player.id,
          name: nameChanged ? values.name : undefined,
          imageId: imageId,
        },
        { onSuccess: handleMutationSuccess },
      );
    }
    if (player.type === "shared" && nameChanged) {
      updatePlayerMutation.mutate(
        {
          type: "shared" as const,
          id: player.id,
          name: values.name,
        },
        { onSuccess: handleMutationSuccess },
      );
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
      if (value.imageUrl === player.image?.url) {
        updatePlayer({ imageId: undefined, values: value });
        return;
      }
      if (!value.imageUrl) {
        updatePlayer({ imageId: null, values: value });
        return;
      }

      try {
        const imageFile = value.imageUrl as File;

        const uploadResult = await startUpload([imageFile], {
          usageType: "player",
        });
        if (!uploadResult) {
          throw new Error("Image upload failed");
        }

        const imageId = uploadResult[0]
          ? uploadResult[0].serverData.imageId
          : null;

        updatePlayer({ values: value, imageId: imageId });
      } catch (error) {
        console.error("Error uploading Image:", error);
        toast.error("Error", {
          description: "There was a problem uploading your Image.",
        });
      }
    },
  });

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
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <form.Subscribe
            selector={(state) => ({
              isSubmitting: state.isSubmitting,
              isDirty: state.isDirty,
            })}
          >
            {({ isSubmitting, isDirty }) => (
              <Button
                type="submit"
                disabled={
                  isSubmitting || !isDirty || updatePlayerMutation.isPending
                }
              >
                {isSubmitting || updatePlayerMutation.isPending ? (
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
