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
const PlayerContent = ({ setOpen }: { setOpen: (isOpen: boolean) => void }) => {
  const { startUpload } = useUploadThing("imageUploader");
  const router = useRouter();
  const { createPlayerMutation } = useCreatePlayerMutation();

  const form = useAppForm({
    defaultValues: {
      name: "",
      imageUrl: null as File | null,
    },
    validators: {
      onSubmit: playerSchema,
    },
    onSubmit: async ({ value }) => {
      if (!value.imageUrl) {
        createPlayerMutation.mutate(
          { name: value.name, imageId: null },
          {
            onSuccess: () => {
              setOpen(false);
              form.reset();
              router.refresh();
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
            onSuccess: () => {
              setOpen(false);
              form.reset();
              router.refresh();
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
        <DialogTitle>Add Player</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
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
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
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
            )}
          </form.Subscribe>
        </DialogFooter>
      </form>
    </>
  );
};
