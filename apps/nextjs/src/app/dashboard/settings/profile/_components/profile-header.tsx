"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Camera, Mail } from "lucide-react";
import { z } from "zod/v4";

import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import { Button } from "@board-games/ui/button";
import { Card, CardContent } from "@board-games/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "@board-games/ui/form";
import { Input } from "@board-games/ui/input";
import { toast } from "@board-games/ui/toast";

import type { SerializableUser } from "../page";
import { Spinner } from "~/components/spinner";

interface ProfileHeaderProps {
  user: SerializableUser;
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
  const [isEditPictureOpen, setIsEditPictureOpen] = useState(false);
  const initials = `${user.firstName ?? ""}${user.lastName?.[0] ?? ""}`;

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={user.imageUrl}
                  alt={user.fullName ?? "User"}
                />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                onClick={() => setIsEditPictureOpen(true)}
              >
                <Camera className="h-4 w-4" />
                <span className="sr-only">Change profile picture</span>
              </Button>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold">{user.fullName}</h1>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:gap-6">
                {user.primaryEmailAddress && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <span>{user.primaryEmailAddress}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <EditProfilePictureDialog
        serializableUser={user}
        isOpen={isEditPictureOpen}
        setIsOpen={setIsEditPictureOpen}
      />
    </>
  );
}

interface EditProfilePictureDialogProps {
  serializableUser: SerializableUser;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}
function EditProfilePictureDialog({
  serializableUser,
  isOpen,
  setIsOpen,
}: EditProfilePictureDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <EditProfilePictureContent
          serializableUser={serializableUser}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditProfilePictureContent({
  serializableUser,
  setIsOpen,
}: EditProfilePictureDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { user } = useUser();

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const EditProfileSchema = z
    .object({
      file: z
        .instanceof(File)
        .refine(
          (file) => file.size <= 4 * 1024 * 1024,
          `Max image size is 4MB.`,
        )
        .refine(
          (file) => file.type === "image/jpeg" || file.type === "image/png",
          "Only .jpg and .png formats are supported.",
        )
        .or(z.string().nullable()),
    })
    .superRefine((values, ctx) => {
      if (serializableUser.imageUrl === values.file) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Image cannot be the same as current image.",
          path: ["file"],
        });
      }
    });

  const form = useForm({
    schema: EditProfileSchema,
    defaultValues: {
      file: serializableUser.imageUrl,
    },
  });

  const initials = `${serializableUser.firstName?.[0] ?? ""}${serializableUser.lastName?.[0] ?? ""}`;

  async function onSubmit(data: z.infer<typeof EditProfileSchema>) {
    setIsLoading(true);
    if (!user) return;
    if (serializableUser.imageUrl === data.file) {
      setIsLoading(false);
      return;
    }
    await user
      .setProfileImage({ file: data.file })
      .then(() => {
        toast.success("Profile picture updated", {
          description: "Your profile picture has been updated successfully.",
        });

        router.refresh();
        setIsOpen(false);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Error", {
          description: "Failed to update profile picture. Please try again.",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <DialogHeader>
          <DialogTitle>Update Profile Picture</DialogTitle>
          <DialogDescription>
            Upload a new profile picture or avatar.
          </DialogDescription>
        </DialogHeader>
        <div className="flex w-full items-center justify-center">
          <FormField
            control={form.control}
            name="file"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <Avatar className="h-32 w-32">
                    <AvatarImage
                      src={imagePreview ?? serializableUser.imageUrl}
                      alt={serializableUser.fullName ?? "User"}
                    />
                    <AvatarFallback className="text-2xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </FormLabel>
                <FormControl>
                  <Input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      field.onChange(file);
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setImagePreview(url);
                      }
                    }}
                  />
                </FormControl>
                <FormDescription>Upload an image (max 4MB).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
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
    </Form>
  );
}
