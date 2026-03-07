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

export const AddPlayerDialog = ({
  defaultIsOpen = false,
}: {
  defaultIsOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultIsOpen);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="min-h-80 sm:max-w-[465px]">
        <PlayerContent setOpen={setIsOpen} />
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

const uploadPlayerImage = async ({
  imageUrl,
  startUpload,
}: {
  imageUrl: File;
  startUpload: ReturnType<typeof useUploadThing>["startUpload"];
}) => {
  const uploadResult = await startUpload([imageUrl], {
    usageType: "player",
  });
  if (!uploadResult || uploadResult.length === 0) {
    throw new Error("Image upload failed");
  }
  const uploadedFile = uploadResult[0] as
    | { serverData?: { imageId?: number | null } }
    | undefined;
  const imageId = uploadedFile?.serverData?.imageId;
  if (typeof imageId !== "number") {
    throw new Error("Image upload did not return an imageId");
  }
  return imageId;
};

/**
 * Renders the add-player dialog form and handles submit lifecycle.
 */
const PlayerContent = ({ setOpen }: { setOpen: (isOpen: boolean) => void }) => {
  const { startUpload } = useUploadThing("imageUploader");
  const router = useRouter();
  const { createPlayerMutation } = useCreatePlayerMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useAppForm({
    defaultValues: {
      name: "",
      imageUrl: null as File | null,
    },
    validators: {
      onSubmit: playerSchema,
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      try {
        let imageId: number | null = null;
        if (value.imageUrl) {
          try {
            imageId = await uploadPlayerImage({
              imageUrl: value.imageUrl,
              startUpload,
            });
          } catch (error) {
            console.error("Error uploading image:", error);
            toast.error("Error", {
              description: "There was a problem uploading your image.",
            });
            return;
          }
        }

        try {
          await createPlayerMutation.mutateAsync({ name: value.name, imageId });
          finalizePlayerCreate({ setOpen, resetForm: form.reset, router });
        } catch (error) {
          console.error("Error creating player:", error);
          toast.error("Error", {
            description: "There was a problem creating your player.",
          });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
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
            onClick={() => setOpen(false)}
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
