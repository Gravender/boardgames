"use client";

import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, Dices, Plus, Trash } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import { formatDuration, nonNullFileSchema } from "@board-games/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@board-games/ui/alert-dialog";
import { Button, buttonVariants } from "@board-games/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@board-games/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import { toast } from "@board-games/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@board-games/ui/tooltip";

import { Spinner } from "~/components/spinner";
import { useAppForm } from "~/hooks/form";
import {
  useDeleteMatchImageMutation,
  useMatchImages,
} from "~/hooks/mutations/match/image";
import { useTRPC } from "~/trpc/react";
import { useUploadThing } from "~/utils/uploadthing";

type MatchImage = RouterOutputs["image"]["getMatchImages"][number];
export function MatchImages({
  matchId,
  duration,
}: {
  matchId: number;
  duration: number;
}) {
  const [selectedImage, setSelectedImage] = useState<MatchImage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddImageDialogOpen, setIsAddImageDialogOpen] = useState(false);
  const [isDeleteImageDialogOpen, setIsDeleteImageDialogOpen] = useState(false);

  const posthog = usePostHog();

  const { data: matchImages } = useMatchImages({ matchId });
  const deleteMatchImageMutation = useDeleteMatchImageMutation({
    matchId,
    onSuccess: () => {
      setIsDeleteImageDialogOpen(false);
    },
  });
  const deleteMatchImage = () => {
    if (!selectedImage) return;
    posthog.capture("delete match image begin", {
      id: selectedImage.id,
    });
    deleteMatchImageMutation.mutate({
      id: selectedImage.id,
    });
  };

  return (
    <>
      <Card className="w-full border-none">
        <CardHeader className="hidden p-2 pt-2 pb-2">
          <CardTitle className="text-base">Match Images</CardTitle>
        </CardHeader>

        <CardContent className="px-4">
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2">
              {matchImages.map((image) => (
                <CarouselItem
                  key={image.id}
                  className="xs:basis-1/6 basis-1/4 pl-2"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="w-full"
                        onClick={() => {
                          setSelectedImage(image);
                          setIsDialogOpen(true);
                        }}
                      >
                        <div className="relative flex aspect-square size-full shrink-0 overflow-hidden rounded-md border p-0">
                          {image.url ? (
                            <Image
                              src={image.url}
                              alt={image.caption}
                              fill
                              className="aspect-square size-full rounded-md object-cover"
                            />
                          ) : (
                            <Dices className="bg-muted size-full items-center justify-center rounded-md p-2" />
                          )}
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{image.caption}</p>
                        {image.duration && (
                          <div className="text-muted-foreground flex items-center gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatDuration(image.duration, true)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </CarouselItem>
              ))}
              <CarouselItem className="xs:basis-1/6 basis-1/4 pl-2">
                <button
                  className="w-full"
                  onClick={() => setIsAddImageDialogOpen(true)}
                >
                  <div className="relative flex aspect-square size-full shrink-0 overflow-hidden rounded-md border p-0">
                    <Plus className="bg-muted size-full items-center justify-center rounded-md p-2" />
                  </div>
                </button>
              </CarouselItem>
            </CarouselContent>
          </Carousel>
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Full View</DialogTitle>
          </DialogHeader>
          <div className="relative flex aspect-square size-full shrink-0 overflow-hidden rounded-md border p-0">
            {selectedImage?.url ? (
              <Image
                src={selectedImage.url}
                alt={selectedImage.caption}
                fill
                className="aspect-square size-full rounded-md object-cover"
              />
            ) : (
              <Dices className="bg-muted size-full items-center justify-center rounded-md p-2" />
            )}
          </div>
          <DialogFooter className="flex-row gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="mb-2 text-lg font-semibold wrap-break-word md:text-xl">
                {selectedImage?.caption}
              </h3>
              {selectedImage?.duration && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(selectedImage.duration, true)}</span>
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="destructive"
              onClick={() => {
                setIsDeleteImageDialogOpen(true);
                setIsDialogOpen(false);
              }}
              size="icon"
            >
              <Trash />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isAddImageDialogOpen}
        onOpenChange={setIsAddImageDialogOpen}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:max-w-[800px] sm:p-6">
          <AddImageDialogContent
            duration={duration}
            matchId={matchId}
            setIsAddImageDialogOpen={setIsAddImageDialogOpen}
          />
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={isDeleteImageDialogOpen}
        onOpenChange={setIsDeleteImageDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you absolutely sure you want to delete this match image?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="relative flex aspect-square size-full shrink-0 overflow-hidden rounded-md border p-0">
            {selectedImage?.url ? (
              <Image
                src={selectedImage.url}
                alt={selectedImage.caption}
                fill
                className="aspect-square size-full rounded-md object-cover"
              />
            ) : (
              <Dices className="bg-muted size-full items-center justify-center rounded-md p-2" />
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => deleteMatchImage()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
const AddImageSchema = z.object({
  caption: z.string().optional(),
  file: nonNullFileSchema,
});
function AddImageDialogContent({
  duration,
  matchId,
  setIsAddImageDialogOpen,
}: {
  duration: number;
  matchId: number;
  setIsAddImageDialogOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trpc = useTRPC();
  const posthog = usePostHog();
  const queryClient = useQueryClient();
  const { startUpload } = useUploadThing("imageUploader");
  const form = useAppForm({
    defaultValues: {
      caption: "" as string | undefined,
      file: null as File | null,
    } as z.infer<typeof AddImageSchema>,
    validators: {
      onSubmit: AddImageSchema,
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      try {
        posthog.capture("image create begin");
        const uploadResult = await startUpload([value.file], {
          usageType: "match",
          matchId: matchId,
          caption: value.caption,
          duration: duration,
        });
        if (!uploadResult) {
          toast.error("Error", {
            description: "There was a problem uploading your Image.",
          });
          posthog.capture("upload error", { error: "Image upload failed" });
          throw new Error("Image upload failed");
        }
        await queryClient.invalidateQueries(
          trpc.image.getMatchImages.queryOptions({ matchId: matchId }),
        );
        toast.success("Image added successfully!");
      } catch (error) {
        console.error("Error uploading Image:", error);
        posthog.capture("upload error", { error });
        toast.error("Error", {
          description: "There was a problem uploading your Image.",
        });
      } finally {
        setIsAddImageDialogOpen(false);
        setIsSubmitting(false);
      }
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Match Image</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await form.handleSubmit();
        }}
        className="space-y-8"
      >
        <form.AppField name="caption">
          {(field) => (
            <field.TextField
              label="Image Caption"
              placeholder="Image caption"
            />
          )}
        </form.AppField>
        <form.AppField name="file">
          {(field) => (
            <field.FileField
              label="Image"
              description="Upload a match image."
              accept="image/*"
            />
          )}
        </form.AppField>
        <DialogFooter className="gap-2">
          <Button
            type="reset"
            variant="secondary"
            onClick={() => {
              setIsAddImageDialogOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner />
                <span>Submitting...</span>
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
