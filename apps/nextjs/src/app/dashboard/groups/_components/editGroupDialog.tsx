"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type {z} from "zod";

import { insertGroupSchema } from "@board-games/db/schema";
import { Button } from "@board-games/ui/button";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@board-games/ui/form";
import { useToast } from "@board-games/ui/hooks/use-toast";
import { Input } from "@board-games/ui/input";

import type { RouterOutputs } from "~/trpc/react";
import { Spinner } from "~/components/spinner";
import { api } from "~/trpc/react";

export const EditGroupDialog = ({
  group,
  setOpen,
}: {
  group: RouterOutputs["group"]["getGroups"][number];
  setOpen: (isOpen: boolean) => void;
}) => {
  return (
    <DialogContent className="min-h-80 sm:max-w-[465px]">
      <GroupContent setOpen={setOpen} group={group} />
    </DialogContent>
  );
};

const groupSchema = insertGroupSchema.pick({ name: true });
const GroupContent = ({
  setOpen,
  group,
}: {
  setOpen: (isOpen: boolean) => void;
  group: RouterOutputs["group"]["getGroups"][number];
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isGettingPlayers, setIsGettingPlayers] = useState(false);

  const utils = api.useUtils();
  const router = useRouter();

  const form = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: group.name,
    },
  });

  const mutation = api.group.update.useMutation({
    onSuccess: async () => {
      setIsSubmitting(false);
      await utils.group.getGroups.invalidate();
      await utils.dashboard.getGroups.invalidate();
      router.refresh();
      toast({
        title: "Group updated successfully!",
      });
      setOpen(false);
    },
  });
  function onSubmit(values: z.infer<typeof groupSchema>) {
    setIsSubmitting(true);
    mutation.mutate({
      id: group.id,
      name: values.name,
    });
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle>{`Edit ${group.name}`}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Group Name</FormLabel>
                <FormControl>
                  <Input placeholder="Group name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            variant="outline"
            type="button"
            disabled={isGettingPlayers}
            onClick={() => {
              setIsGettingPlayers(true);
              router.push(`/dashboard/groups/${group.id}/edit/players`);
            }}
          >
            {isGettingPlayers ? (
              <>
                <Spinner />
                <span>Navigating...</span>
              </>
            ) : (
              `${group.groupsByPlayer.length} Players`
            )}
          </Button>
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
                  <span>Submiting...</span>
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};
