"use client";

import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AtSign, Loader2, Mail, UserPlus } from "lucide-react";
import * as z from "zod/v4";

import { Button } from "@board-games/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";
import { toast } from "@board-games/ui/toast";

import { useTRPC } from "~/trpc/react";

const emailSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

const usernameSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type UsernameFormValues = z.infer<typeof usernameSchema>;

export function AddFriendDialog() {
  // Explicitly manage dialog open state
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Friend
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <Content setIsOpen={setIsOpen} />
      </DialogContent>
    </Dialog>
  );
}
const Content = ({
  setIsOpen,
}: {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("email");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const sendFriendRequestMutation = useMutation(
    trpc.friend.sendFriendRequest.mutationOptions({
      onSuccess: (response) => {
        setIsSubmitting(false);
        void queryClient.invalidateQueries(
          trpc.friend.getFriendRequests.queryOptions(),
        );
        void queryClient.invalidateQueries(
          trpc.friend.getSentFriendRequests.queryOptions(),
        );
        if (response.success) {
          toast("Friend request sent", {
            description: response.message,
          });
        } else {
          toast.info("Friend request failed", {
            description: response.message,
          });
        }
        setIsOpen(false);
      },
    }),
  );

  const emailForm = useForm({
    schema: emailSchema,
    defaultValues: {
      email: "",
    },
  });

  const usernameForm = useForm({
    schema: usernameSchema,
    defaultValues: {
      username: "",
    },
  });

  function onSubmitEmail(values: EmailFormValues) {
    handleSubmit(values.email, "email");
  }

  function onSubmitUsername(values: UsernameFormValues) {
    handleSubmit(values.username, "username");
  }

  function handleSubmit(value: string, type: "email" | "username") {
    setIsSubmitting(true);

    if (type === "email") {
      sendFriendRequestMutation.mutate({
        type,
        email: value,
      });
    } else {
      sendFriendRequestMutation.mutate({
        type,
        username: value,
      });
    }
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add a Friend</DialogTitle>
        <DialogDescription>
          Send a friend request by email or username.
        </DialogDescription>
      </DialogHeader>

      <Tabs defaultValue="email" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="username">Username</TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <Form {...emailForm}>
            <form
              onSubmit={emailForm.handleSubmit(onSubmitEmail)}
              className="space-y-4 py-4"
            >
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="text-muted-foreground absolute top-3 left-2 h-4 w-4" />
                        <Input
                          placeholder="email@example.com"
                          className="pl-8"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Enter the email address of the person you want to add.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Friend Request"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="username">
          <Form {...usernameForm}>
            <form
              onSubmit={usernameForm.handleSubmit(onSubmitUsername)}
              className="space-y-4 py-4"
            >
              <FormField
                control={usernameForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <AtSign className="text-muted-foreground absolute top-3 left-2 h-4 w-4" />
                        <Input
                          placeholder="username"
                          className="pl-8"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Enter the username of the person you want to add.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Friend Request"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </>
  );
};
