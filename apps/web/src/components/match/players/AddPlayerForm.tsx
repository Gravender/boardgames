"use client";

import { useCallback } from "react";

import { insertPlayerSchema } from "@board-games/db/zodSchema";
import { fileSchema } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";

import { useAppForm } from "~/hooks/form";
import { usePlayerCreation } from "./usePlayerCreation";

const addPlayerSchema = insertPlayerSchema.pick({ name: true }).extend({
  imageFile: fileSchema,
});

export const AddPlayerForm = ({
  addMatchPlayer,
  cancel,
}: {
  addMatchPlayer: (player: {
    id: number;
    imageUrl: string | null;
    name: string;
  }) => void;
  cancel: () => void;
}) => {
  const form = useAppForm({
    defaultValues: {
      name: "",
      imageFile: null as File | null,
    },
    validators: {
      onSubmit: addPlayerSchema,
    },
    onSubmit: async ({ value }) => {
      await handleSubmit(value);
    },
  });

  const handleCreatePlayerSuccess = useCallback(
    (player: {
      id: number;
      name: string;
      image: { url: string | null } | null;
    }) => {
      addMatchPlayer({
        id: player.id,
        imageUrl: player.image?.url ?? null,
        name: player.name,
      });
      form.reset();
    },
    [addMatchPlayer, form],
  );

  const { handleSubmit } = usePlayerCreation({
    onCreateSuccess: handleCreatePlayerSuccess,
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

        <form.AppField name="imageFile">
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
