import { useState } from "react";
import Image from "next/image";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "lucide-react";

import { insertPlayerSchema } from "@board-games/db/zodSchema";
import { fileSchema } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@board-games/ui/field";
import { Input } from "@board-games/ui/input";
import { toast } from "@board-games/ui/toast";

import { Spinner } from "~/components/spinner";
import { useTRPC } from "~/trpc/react";
import { useUploadThing } from "~/utils/uploadthing";

const addPlayerSchema = insertPlayerSchema.pick({ name: true }).extend({
  imageUrl: fileSchema,
});
export function AddPlayerForm({
  description,
  onReset,
  onPlayerAdded,
}: {
  description: string;
  onReset: () => void;
  onPlayerAdded?: (player: {
    id: number;
    name: string;
    image: {
      url: string | null;
      name: string;
      type: "file" | "svg";
      usageType: "player" | "match" | "game";
    } | null;
  }) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { startUpload } = useUploadThing("imageUploader");
  const createPlayer = useMutation(
    trpc.player.create.mutationOptions({
      onSuccess: async (player) => {
        setIsUploading(false);
        await queryClient.cancelQueries(
          trpc.newPlayer.getPlayersForMatch.queryOptions(),
        );
        const prePlayerData = queryClient.getQueryData(
          trpc.newPlayer.getPlayersForMatch.queryOptions().queryKey,
        );
        const newData = {
          players: [
            ...(prePlayerData?.players ?? []),
            {
              id: player.id,
              isUser: false,
              type: "original" as const,
              name: player.name,
              matches: 0,
              image: player.image ?? null,
            },
          ],
        };
        queryClient.setQueryData(
          trpc.newPlayer.getPlayersForMatch.queryOptions().queryKey,
          newData,
        );
        await queryClient.invalidateQueries();
        toast("Player created successfully!");
        if (onPlayerAdded) {
          onPlayerAdded({
            id: player.id,
            name: player.name,
            image: player.image ?? null,
          });
        }
      },
    }),
  );
  const form = useForm({
    formId: "add-player-form",
    defaultValues: {
      name: "",
      imageUrl: null as File | null,
    },
    validators: {
      onSubmit: addPlayerSchema,
    },
    onSubmit: async ({ value }) => {
      setIsUploading(true);
      if (!value.imageUrl) {
        createPlayer.mutate({
          name: value.name,
          imageId: null,
        });
        return;
      }

      try {
        const imageFile = value.imageUrl;

        const uploadResult = await startUpload([imageFile], {
          usageType: "player",
        });
        if (!uploadResult) {
          throw new Error("Image upload failed");
        }

        const imageId = uploadResult[0]
          ? uploadResult[0].serverData.imageId
          : null;

        createPlayer.mutate({
          name: value.name,
          imageId: imageId,
        });
        form.reset();
        setImagePreview(null); // Clear the image preview
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
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <form
        id={form.formId}
        onSubmit={async (e) => {
          e.preventDefault();
          await form.handleSubmit();
        }}
      >
        <FieldGroup>
          <form.Field
            name="name"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Player Name</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Player Name"
                    autoComplete="off"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
          <form.Field
            name="imageUrl"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Image</FieldLabel>
                  <div className="flex items-center space-x-4">
                    <div className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded-full">
                      {imagePreview ? (
                        <Image
                          src={imagePreview}
                          alt="Player image"
                          className="aspect-square h-full w-full rounded-sm object-cover"
                          fill
                        />
                      ) : (
                        <User className="bg-muted h-full w-full items-center justify-center rounded-full p-2" />
                      )}
                    </div>
                    <Input
                      type="file"
                      accept="image/*"
                      id={field.name}
                      name={field.name}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        field.handleChange(file ?? null);
                        if (file) {
                          const url = URL.createObjectURL(file);
                          setImagePreview(url);
                        }
                      }}
                      aria-invalid={isInvalid}
                    />
                  </div>
                  <FieldDescription>
                    Upload an image (max 4MB).
                  </FieldDescription>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
        </FieldGroup>
        <DialogFooter className="gap-2">
          <Field orientation="horizontal">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                onReset();
              }}
            >
              Reset
            </Button>
            <Button type="submit" form={form.formId} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Spinner />
                  <span>Uploading...</span>
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </Field>
        </DialogFooter>
      </form>
    </>
  );
}
