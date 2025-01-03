"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Spinner } from "~/components/spinner";
import { Button } from "~/components/ui/button";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { useToast } from "~/hooks/use-toast";
import { insertGroupSchema } from "~/server/db/schema";
import { api, type RouterOutputs } from "~/trpc/react";

export const EditGroupDialog = ({
  group,
  setOpen,
}: {
  group: RouterOutputs["group"]["getGroups"][number];
  setOpen: (isOpen: boolean) => void;
}) => {
  return (
    <DialogContent className="sm:max-w-[465px] min-h-80">
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
