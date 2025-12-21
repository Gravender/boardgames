"use client";

import { useEffect, useState } from "react";
import { usePostHog } from "posthog-js/react";

import type { ImagePreviewType } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import { toast } from "@board-games/ui/toast";

import { Spinner } from "~/components/spinner";
import { useAppForm } from "~/hooks/form";
import { useAddGameMutation } from "~/hooks/mutations/game/add";
import { useUploadThing } from "~/utils/uploadthing";
import { addGameFormSchema, defaultValues } from "./add-game.types";
import { GameDetailsForm } from "./game-details-form";
import { RolesForm } from "./roles-form";
import { ScoresheetForm } from "./scoresheet-form";

export function AddGameForm({
  setIsOpen,
}: {
  setIsOpen: (isOpen: boolean) => void;
}) {
  const [imagePreview, setImagePreview] = useState<ImagePreviewType | null>(
    null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const { createGameMutation } = useAddGameMutation();
  const { startUpload } = useUploadThing("imageUploader");
  const posthog = usePostHog();

  const form = useAppForm({
    formId: "add-game-form",
    defaultValues: defaultValues,
    validators: {
      onSubmit: addGameFormSchema,
    },
    onSubmit: async ({ value }) => {
      setIsUploading(true);
      posthog.capture("game create begin");

      const gameValues = value.game;
      const scoreSheets = value.scoresheets;

      if (gameValues.gameImg === null || gameValues.gameImg.type === "svg") {
        createGameMutation.mutate(
          {
            game: {
              name: gameValues.name,
              ownedBy: gameValues.ownedBy,
              playersMin: gameValues.playersMin,
              playersMax: gameValues.playersMax,
              playtimeMin: gameValues.playtimeMin,
              playtimeMax: gameValues.playtimeMax,
              yearPublished: gameValues.yearPublished,
            },
            image:
              gameValues.gameImg?.type === "svg"
                ? {
                    type: "svg",
                    name: gameValues.gameImg.name,
                  }
                : null,
            scoresheets: scoreSheets,
            roles: gameValues.roles,
          },
          {
            onSuccess: () => {
              setImagePreview(null);
              form.reset();
              setIsUploading(false);
              setIsOpen(false);
            },
          },
        );
      } else {
        try {
          const imageFile = gameValues.gameImg.file;

          posthog.capture("upload begin", {
            type: "game",
            gameName: gameValues.name,
            fileName: imageFile.name,
          });

          const uploadResult = await startUpload([imageFile], {
            usageType: "game",
          });

          if (!uploadResult) {
            toast.error("Error", {
              description: "There was a problem uploading your Image.",
            });
            throw new Error("Image upload failed");
          }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const imageId = uploadResult[0]
            ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              uploadResult[0].serverData.imageId
            : null;

          createGameMutation.mutate(
            {
              game: {
                name: gameValues.name,
                ownedBy: gameValues.ownedBy,
                playersMin: gameValues.playersMin,
                playersMax: gameValues.playersMax,
                playtimeMin: gameValues.playtimeMin,
                playtimeMax: gameValues.playtimeMax,
                yearPublished: gameValues.yearPublished,
              },
              image: imageId
                ? {
                    type: "file",
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    imageId: imageId,
                  }
                : null,
              scoresheets: scoreSheets,
              roles: gameValues.roles,
            },
            {
              onSuccess: () => {
                setImagePreview(null);
                form.reset();
                setIsUploading(false);
                setIsOpen(false);
              },
              onError: () => {
                setIsUploading(false);
              },
            },
          );
        } catch (error) {
          console.error("Error uploading Image:", error);
          posthog.capture("upload error", { error });
          toast.error("Error", {
            description: "There was a problem uploading your Image.",
          });
          setIsUploading(false);
        }
      }
    },
  });

  useEffect(() => {
    return () => {
      if (imagePreview?.type === "file") {
        URL.revokeObjectURL(imagePreview.url);
      }
    };
  }, [imagePreview]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.Subscribe
        selector={(state) => ({
          activeForm: state.values.activeForm,
          activeScoreSheetIndex: state.values.activeScoreSheetIndex ?? 0,
        })}
      >
        {({ activeForm, activeScoreSheetIndex }) => {
          return (
            <>
              <DialogHeader>
                <DialogTitle>
                  {activeForm === "scoresheet" ? "Add Scoresheet" : "Add Game"}
                </DialogTitle>
              </DialogHeader>
              {activeForm === "scoresheet" && (
                <ScoresheetForm
                  form={form}
                  fields={{
                    scoresheet: `scoresheets[${activeScoreSheetIndex}].scoresheet`,
                    rounds: `scoresheets[${activeScoreSheetIndex}].rounds`,
                  }}
                  onSave={() => {
                    form.setFieldValue("activeForm", "game");
                  }}
                  onBack={() => {
                    form.setFieldValue("activeForm", "game");
                  }}
                />
              )}
              {activeForm === "game" && (
                <>
                  <GameDetailsForm
                    form={form}
                    imagePreview={imagePreview}
                    setImagePreview={setImagePreview}
                    setIsScoresheet={() =>
                      form.setFieldValue("activeForm", "scoresheet")
                    }
                    setActiveScoreSheet={(index) =>
                      form.setFieldValue("activeScoreSheetIndex", index)
                    }
                  />
                  <DialogFooter className="gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsOpen(false)}
                    >
                      Cancel
                    </Button>
                    <form.AppForm>
                      <form.Subscribe selector={(state) => state.isSubmitting}>
                        {(isSubmitting) => (
                          <Button
                            type="submit"
                            disabled={isUploading || isSubmitting}
                          >
                            {isUploading || isSubmitting ? (
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
                    </form.AppForm>
                  </DialogFooter>
                </>
              )}
              {activeForm === "roles" && (
                <RolesForm
                  form={form}
                  fields={{
                    roles: "game.roles",
                  }}
                  onClose={() => form.setFieldValue("activeForm", "game")}
                />
              )}
            </>
          );
        }}
      </form.Subscribe>
    </form>
  );
}
