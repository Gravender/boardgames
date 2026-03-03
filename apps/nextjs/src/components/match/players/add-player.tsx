"use client";

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

import { Spinner } from "~/components/spinner";
import { useAppForm } from "~/hooks/form";
import { useCreatePlayerMutation } from "~/hooks/mutations/player/create";
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
  const { createPlayerMutation } = useCreatePlayerMutation();

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

        const imageId = uploadResult[0]
          ? uploadResult[0].serverData.imageId
          : null;

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
          },
        );
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
        <DialogTitle>Add New Player</DialogTitle>
        <DialogDescription>
          Create a new player to add to your match.
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-8"
      >
        <form.AppField name="name">
          {(field) => <field.TextField label="Player Name" placeholder="Player name" />}
        </form.AppField>

        <form.AppField name="imageUrl">
          {(field) => (
            <field.FileField label="Image" description="Upload an image (max 4MB)." />
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
