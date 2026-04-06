"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod/v4";

import { Button } from "@board-games/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";

import { GroupPlayerSelectorField } from "~/components/group/group-player-selector-field";
import { Spinner } from "~/components/spinner";
import { useAppForm } from "~/hooks/form";
import { useUpdateGroupMutation } from "~/hooks/mutations/group/update";
import { useTRPC } from "~/trpc/react";

const editGroupFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  playerIds: z
    .array(z.number())
    .min(1, "At least one player must stay in the group"),
});

export type GroupMember = { id: number; name: string; type: "original" };

export const EditGroupDialog = ({
  group,
  open,
  onOpenChange,
}: {
  group: { id: number; name: string; players: readonly GroupMember[] };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const trpc = useTRPC();
  const { data: players = [] } = useQuery(
    trpc.player.getPlayers.queryOptions(),
  );
  const originalPlayers = players.filter((p) => p.type === "original");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialNameRef = useRef("");
  const initialIdsRef = useRef<number[]>([]);

  const updateMutation = useUpdateGroupMutation();

  const form = useAppForm({
    defaultValues: {
      name: group.name,
      playerIds: group.players.map((p) => p.id),
    },
    validators: {
      onSubmit: editGroupFormSchema,
    },
    onSubmit: async ({ value }) => {
      const nameChanged = value.name.trim() !== initialNameRef.current.trim();
      const initial = new Set(initialIdsRef.current);
      const next = new Set(value.playerIds);
      const playersChanged =
        initial.size !== next.size ||
        [...next].some((id) => !initial.has(id)) ||
        [...initial].some((id) => !next.has(id));

      if (!nameChanged && !playersChanged) {
        onOpenChange(false);
        return;
      }

      setIsSubmitting(true);
      try {
        await updateMutation.mutateAsync({
          id: group.id,
          name: value.name.trim(),
          players: value.playerIds.map((pid) => ({ id: pid })),
        });
        form.reset();
        onOpenChange(false);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const memberKey = group.players
    .map((m) => m.id)
    .toSorted((a, b) => a - b)
    .join(",");

  useEffect(() => {
    if (!open) {
      return;
    }
    const ids = group.players.map((p) => p.id);
    initialNameRef.current = group.name;
    initialIdsRef.current = ids;
    form.reset({
      name: group.name,
      playerIds: ids,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `form` from useAppForm is a stable instance for this dialog; listing `form` would satisfy exhaustive-deps but adds noise since `reset` identity is tied to that stable form. Effect intentionally reruns only when the dialog opens or group identity/membership changes.
  }, [open, group.id, group.name, memberKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden border-border/80 p-0 sm:max-w-md">
        <div className="border-border/60 from-muted/40 bg-linear-to-br to-background border-b px-6 py-5">
          <DialogHeader className="gap-1">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Edit group
            </DialogTitle>
            <DialogDescription>
              Update the name and who belongs in this group.
            </DialogDescription>
          </DialogHeader>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await form.handleSubmit();
          }}
          className="space-y-6 overflow-y-auto px-6 py-5"
        >
          <form.AppField name="name">
            {(field) => (
              <field.TextField label="Group name" placeholder="Group name" />
            )}
          </form.AppField>

          <GroupPlayerSelectorField
            form={form}
            fields={{ playerIds: "playerIds" }}
            players={originalPlayers}
            label="Members"
            ariaLabel="Players in this group"
          />

          <DialogFooter className="gap-2 border-border/60 border-t px-0 pt-4 sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!isSubmitting) {
                  onOpenChange(false);
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
                  <span>Saving…</span>
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
