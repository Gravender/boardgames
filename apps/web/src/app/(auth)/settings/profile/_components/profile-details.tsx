"use client";

import { useState } from "react";
import { z } from "zod/v4";

import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
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

import { authClient } from "~/auth/client";

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  username: z
    .string()
    .min(2, "Username must be at least 2 characters.")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores.",
    ),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileDetailsProps {
  user: {
    id: string;
    name: string;
    emailVerified: boolean;
    email: string;
    createdAt: Date;
    updatedAt: Date;
    image?: string | null | undefined;
    username?: string | null | undefined;
    displayUsername?: string | null | undefined;
  };
}

export function ProfileDetails({ user }: ProfileDetailsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const defaultValues: Partial<ProfileFormValues> = {
    name: user.name,
    username: user.username ?? "",
  };

  const form = useForm({
    schema: profileFormSchema,
    defaultValues,
  });

  async function onSubmit(data: ProfileFormValues) {
    await authClient.updateUser(
      { name: data.name, username: data.username },
      {
        onSuccess: () => {
          toast.success("Profile updated", {
            description: "Your profile has been updated successfully.",
          });
          setIsLoading(false);
        },
        onLoading: () => {
          toast.loading("Updating profile...");
          setIsLoading(true);
        },
        onError: () => {
          toast.error("Error", {
            description: "Failed to update profile. Please try again.",
          });
          setIsLoading(false);
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>
          Update your personal information and how others see you on the
          platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="John_Doe" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is your public username. It can only contain letters,
                    numbers, and underscores.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
