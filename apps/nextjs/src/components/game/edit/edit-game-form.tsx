"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { RouterOutputs } from "@board-games/api";
import type { ImagePreviewType } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { toast } from "@board-games/ui/toast";

import { Spinner } from "~/components/spinner";
import { useAppForm } from "~/hooks/form";
import { useUpdateGameMutation } from "~/hooks/mutations/game/update";
import { useUploadThing } from "~/utils/uploadthing";
import { RolesForm } from "../add/roles-form";
import { transformToApiInput } from "./edit-game-transforms";
import {
  editGameFormSchema,
  transformEditGameDataToFormValues,
} from "./edit-game.types";
import { ScoresheetForm } from "./edit-scoresheet-form";
import { GameDetailsForm } from "./game-details-form";

export function EditGameForm({
  initialGame,
  initialScoresheets,
  initialRoles,
}: {
  initialGame: NonNullable<RouterOutputs["game"]["getGame"]>;
  initialScoresheets: NonNullable<
    RouterOutputs["game"]["gameScoreSheetsWithRounds"]
  >;
  initialRoles: NonNullable<RouterOutputs["game"]["gameRoles"]>;
}) {
  const [imagePreview, setImagePreview] = useState<ImagePreviewType | null>(
    null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const { startUpload } = useUploadThing("imageUploader");
  const router = useRouter();
  const { updateGameMutation } = useUpdateGameMutation();

  const defaultValues = transformEditGameDataToFormValues(
    initialGame,
    initialScoresheets,
    initialRoles,
  );

  // Initialize image preview from existing data
  useEffect(() => {
    if (initialGame.image) {
      if (initialGame.image.type === "file") {
        setImagePreview({
          type: "file",
          url: initialGame.image.url ?? "",
        });
      } else {
        setImagePreview({
          type: "svg",
          name: initialGame.image.name,
        });
      }
    }
  }, [initialGame.image]);

  const form = useAppForm({
    formId: "edit-game-form",
    defaultValues: defaultValues,
    validators: {
      onSubmit: editGameFormSchema,
    },
    onSubmit: async ({ value }) => {
      setIsUploading(true);

      const gameValues = value.game;

      // Check if image changed
      const isSameImage = () => {
        if (gameValues.gameImg === null && initialGame.image === null)
          return true;
        if (gameValues.gameImg?.type === initialGame.image?.type) {
          if (gameValues.gameImg?.type === "file") {
            return (
              typeof gameValues.gameImg.file === "string" &&
              gameValues.gameImg.file === initialGame.image?.url
            );
          }
          if (gameValues.gameImg?.type === "svg") {
            return gameValues.gameImg.name === initialGame.image?.name;
          }
        }
        return false;
      };

      let image:
        | { type: "svg"; name: string }
        | { type: "file"; imageId: number }
        | null
        | undefined = undefined;

      if (isSameImage()) {
        image = undefined;
      } else if (gameValues.gameImg === null) {
        image = null;
      } else if (gameValues.gameImg.type === "svg") {
        image = {
          type: "svg",
          name: gameValues.gameImg.name,
        };
      } else {
        // File upload needed
        try {
          const imageFile = gameValues.gameImg.file;
          if (!(imageFile instanceof File)) {
            throw new Error("Expected a File for upload");
          }
          const uploadResult = await startUpload([imageFile], {
            usageType: "game",
          });

          if (!uploadResult) {
            throw new Error("Image upload failed");
          }

          const imageId = uploadResult[0]
            ? uploadResult[0].serverData.imageId
            : null;

          image = imageId
            ? {
                type: "file",
                imageId: imageId,
              }
            : null;
        } catch (error) {
          console.error("Error uploading Image:", error);
          toast.error("Error", {
            description: "There was a problem uploading your Image.",
          });
          setIsUploading(false);
          return;
        }
      }

      // Transform to API format
      const apiInput = transformToApiInput(
        value,
        initialGame,
        initialScoresheets,
        initialRoles,
        image,
      );

      // Only mutate if there are changes
      const hasChanges =
        apiInput.game.type !== "default" ||
        apiInput.scoresheets.length > 0 ||
        apiInput.scoresheetsToDelete.length > 0 ||
        apiInput.updatedRoles.length > 0 ||
        apiInput.newRoles.length > 0 ||
        apiInput.deletedRoles.length > 0;

      if (hasChanges) {
        updateGameMutation.mutate(apiInput, {
          onSuccess: () => {
            form.reset();
            setImagePreview(null);
            router.push(`/dashboard/games`);
          },
          onSettled: () => {
            setIsUploading(false);
          },
        });
      } else {
        setIsUploading(false);
        toast("No changes to save");
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
    <Card className="w-full sm:max-w-2xl">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await form.handleSubmit();
        }}
      >
        <form.Subscribe
          selector={(state) => ({
            activeForm: state.values.activeForm,
            activeScoreSheetIndex: state.values.activeScoreSheetIndex ?? 0,
            scoresheets: state.values.scoresheets,
          })}
        >
          {({ activeForm, activeScoreSheetIndex, scoresheets }) => {
            const currentScoresheet = scoresheets[activeScoreSheetIndex];
            const scoresheetName =
              currentScoresheet?.scoresheet.name ??
              `Scoresheet ${scoresheets.length}`;
            const editable =
              currentScoresheet?.scoresheetType === "shared" &&
              currentScoresheet.permission !== "edit"
                ? false
                : true;
            return (
              <>
                <CardHeader>
                  <CardTitle>
                    {activeForm === "scoresheet"
                      ? `Edit ${scoresheetName} Scoresheet`
                      : `Edit ${initialGame.name}`}
                  </CardTitle>
                </CardHeader>
                {activeForm === "scoresheet" && currentScoresheet && (
                  <CardContent>
                    <ScoresheetForm
                      form={form}
                      key={`scoresheet-${activeScoreSheetIndex}-${currentScoresheet.scoresheet.id}`}
                      onSave={() => {
                        if (currentScoresheet.scoresheetType !== "new") {
                          form.setFieldValue(
                            `scoresheets[${activeScoreSheetIndex}].scoreSheetChanged`,
                            true,
                          );
                          form.setFieldValue(
                            `scoresheets[${activeScoreSheetIndex}].roundChanged`,
                            true,
                          );
                        }
                        form.setFieldValue("activeForm", "game");
                      }}
                      onBack={() => {
                        form.setFieldValue("activeForm", "game");
                      }}
                      roundsEditable={editable}
                      scoresheetEditable={editable}
                    />
                  </CardContent>
                )}
                {activeForm === "game" && (
                  <>
                    <CardContent>
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
                    </CardContent>
                    <CardFooter className="flex flex-row justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => router.back()}
                      >
                        Cancel
                      </Button>
                      <form.AppForm>
                        <form.Subscribe
                          selector={(state) => state.isSubmitting}
                        >
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
                    </CardFooter>
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
    </Card>
  );
}
