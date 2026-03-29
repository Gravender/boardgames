"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";

import { insertPlayerSchema } from "@board-games/db/zodSchema";
import { fileSchema } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@board-games/ui/dialog";
import { toast } from "@board-games/ui/toast";

import { Spinner } from "~/components/spinner";
import { useAppForm } from "~/hooks/form";
import { useCreatePlayerMutation } from "~/hooks/mutations/player/create";
import { useUploadThing } from "~/utils/uploadthing";

/**
 * Renders a dialog for creating a new player.
 * @param defaultIsOpen When true, the dialog starts open (default: false).
 * @returns The add-player dialog element with trigger and form content.
 */
export const AddPlayerDialog = ({
  defaultIsOpen = false,
}: {
  defaultIsOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultIsOpen);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting && !nextOpen) {
      return;
    }
    setIsOpen(nextOpen);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="min-h-80 sm:max-w-[465px]"
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
          setOpen={setIsOpen}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
        />
      </DialogContent>
      <div className="flex h-full w-full flex-col justify-end">
        <div className="flex justify-end">
          <DialogTrigger asChild>
            <Button
              variant="default"
              className="rounded-full"
              size="icon"
              type="button"
              aria-label="add player"
            >
              <PlusIcon />
            </Button>
          </DialogTrigger>
        </div>
      </div>
    </Dialog>
  );
};

const playerSchema = insertPlayerSchema.pick({ name: true }).extend({
  imageUrl: fileSchema,
});

const finalizePlayerCreate = ({
  setOpen,
  resetForm,
  router,
}: {
  setOpen: (isOpen: boolean) => void;
  resetForm: () => void;
  router: ReturnType<typeof useRouter>;
}) => {
  setOpen(false);
  resetForm();
  router.refresh();
};

const useUploadPlayerImage = () => {
  const { startUpload } = useUploadThing("imageUploader");

  const uploadPlayerImage = async ({ imageUrl }: { imageUrl: File }) => {
    const uploadResult = await startUpload([imageUrl], {
      usageType: "player",
    });
    if (!uploadResult || uploadResult.length === 0) {
      throw new Error("Image upload failed");
    }
    const uploadedFile = uploadResult[0];
    const imageId = uploadedFile?.serverData.imageId;
    if (typeof imageId !== "number") {
      throw new Error("Image upload did not return an imageId");
    }
    return imageId;
  };

  return { uploadPlayerImage };
};

const usePlayerCreateSubmit = ({
  setOpen,
  resetForm,
  setIsSubmitting,
}: {
  setOpen: (isOpen: boolean) => void;
  resetForm: () => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
}) => {
  const { uploadPlayerImage } = useUploadPlayerImage();
  const router = useRouter();
  const { createPlayerMutation } = useCreatePlayerMutation();

  const handleSubmit = async ({
    name,
    imageUrl,
  }: {
    name: string;
    imageUrl: File | null;
  }) => {
    setIsSubmitting(true);
    try {
      let imageId: number | null = null;
      if (imageUrl) {
        try {
          imageId = await uploadPlayerImage({ imageUrl });
        } catch (error) {
          console.error("Error uploading image:", error);
          toast.error("Error", {
            description: "There was a problem uploading your image.",
          });
          return;
        }
      }

      try {
        await createPlayerMutation.mutateAsync({ name, imageId });
        finalizePlayerCreate({ setOpen, resetForm, router });
      } catch (error) {
        console.error("Error creating player:", error);
        toast.error("Error", {
          description: "There was a problem creating your player.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return { handleSubmit };
};

/**
 * Renders the add-player dialog form and handles submit lifecycle.
 */
const PlayerContent = ({
  setOpen,
  isSubmitting,
  setIsSubmitting,
}: {
  setOpen: (isOpen: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
}) => {
  const form = useAppForm({
    defaultValues: {
      name: "",
      imageUrl: null as File | null,
    },
    validators: {
      onSubmit: playerSchema,
    },
    onSubmit: async ({ value }) => {
      await handleSubmit(value);
    },
  });

  const { handleSubmit } = usePlayerCreateSubmit({
    setOpen,
    resetForm: form.reset,
    setIsSubmitting,
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Player</DialogTitle>
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
          <Button
            type="reset"
            variant="secondary"
            onClick={() => {
              if (isSubmitting) {
                return;
              }
              setOpen(false);
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner />
                <span>Uploading...</span>
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
};
