"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { z } from "zod/v4";

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

import { GroupPlayerSelectorField } from "~/components/group/group-player-selector-field";
import { Spinner } from "~/components/spinner";
import { useAppForm } from "~/hooks/form";
import { useCreateGroupMutation } from "~/hooks/mutations/group/create";
import { useTRPC } from "~/trpc/react";

const addGroupFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  playerIds: z.array(z.number()).min(1, "Select at least one player"),
});

export const AddGroupDialog = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="gap-0 overflow-hidden border-border/80 p-0 sm:max-w-md">
        <div className="border-border/60 from-muted/40 bg-linear-to-br to-background border-b px-6 py-5">
          <DialogHeader className="gap-1">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              New group
            </DialogTitle>
            <DialogDescription>
              Name your group and pick who belongs in it. Groups power match
              filters and stats.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="px-6 py-5">
          <AddGroupFormContent setOpen={setIsOpen} />
        </div>
      </DialogContent>
      <div className="absolute right-4 bottom-4 z-10 sm:right-10">
        <div className="flex justify-end">
          <DialogTrigger
            render={
              <Button
                variant="default"
                className="h-12 w-12 rounded-full shadow-md"
                size="icon"
                type="button"
                aria-label="Add group"
              >
                <PlusIcon className="size-5" />
              </Button>
            }
          />
        </div>
      </div>
    </Dialog>
  );
};

const AddGroupFormContent = ({
  setOpen,
}: {
  setOpen: (open: boolean) => void;
}) => {
  const trpc = useTRPC();
  const { data: players = [] } = useQuery(
    trpc.player.getPlayers.queryOptions(),
  );
  const originalPlayers = players.filter((p) => p.type === "original");

  const createMutation = useCreateGroupMutation({
    onSuccess: async () => {
      setOpen(false);
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: "",
      playerIds: [] as number[],
    },
    validators: {
      onSubmit: addGroupFormSchema,
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync({
        name: value.name,
        players: value.playerIds.map((id) => ({ id })),
      });
      form.reset();
    },
  });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await form.handleSubmit();
      }}
      className="space-y-6"
    >
      <form.AppField name="name">
        {(field) => (
          <field.TextField label="Name" placeholder="Friday regulars" />
        )}
      </form.AppField>

      <GroupPlayerSelectorField
        form={form}
        fields={{ playerIds: "playerIds" }}
        players={originalPlayers}
        label="Players"
        ariaLabel="Players to include in this group"
      />

      <form.AppForm>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <DialogFooter className="gap-2 border-border/60 border-t pt-4 sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (!isSubmitting) {
                    setOpen(false);
                  }
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner />
                    <span>Creating…</span>
                  </>
                ) : (
                  "Create group"
                )}
              </Button>
            </DialogFooter>
          )}
        </form.Subscribe>
      </form.AppForm>
    </form>
  );
};
