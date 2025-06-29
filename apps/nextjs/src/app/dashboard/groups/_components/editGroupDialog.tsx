import type { z } from "zod/v4";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { RouterOutputs } from "@board-games/api";
import { insertGroupSchema } from "@board-games/db/zodSchema";
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
  useForm,
} from "@board-games/ui/form";
import { Input } from "@board-games/ui/input";
import { toast } from "@board-games/ui/toast";

import { Spinner } from "~/components/spinner";
import { useTRPC } from "~/trpc/react";

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
  const trpc = useTRPC();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isGettingPlayers, setIsGettingPlayers] = useState(false);

  const queryClient = useQueryClient();
  const router = useRouter();

  const form = useForm({
    schema: groupSchema,
    defaultValues: {
      name: group.name,
    },
  });

  const mutation = useMutation(
    trpc.group.update.mutationOptions({
      onSuccess: async () => {
        setIsSubmitting(false);
        await queryClient.invalidateQueries(
          trpc.group.getGroups.queryOptions(),
        );
        await queryClient.invalidateQueries(
          trpc.dashboard.getGroups.queryOptions(),
        );
        router.refresh();
        toast.success("Group updated successfully!");
        setOpen(false);
      },
    }),
  );
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
              `${group.players.length} Players`
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
                  <span>Submitting...</span>
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
