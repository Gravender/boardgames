"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  MoreVertical,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

import { Button } from "@board-games/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@board-games/ui/dropdown-menu";

import { ConfirmDeleteDialog } from "~/components/confirm-delete-dialog";
import type { GroupRow } from "~/hooks/queries/group/groups";
import { useDeleteGroupMutation } from "~/hooks/mutations/group/delete";

import { EditGroupDialog } from "./edit-group-dialog";
import { GroupPlayerAvatarStack } from "./group-player-avatar-stack";

export type GroupForDropdown = GroupRow & { matches: number };

export const GroupDropdown = ({
  group,
  onDeleted,
  /** On group detail page, parent owns one `EditGroupDialog` — pass both props. */
  editOpen: editOpenControlled,
  onEditOpenChange: onEditOpenChangeControlled,
  variant = "full",
}: {
  group: GroupForDropdown;
  onDeleted?: () => void;
  editOpen?: boolean;
  onEditOpenChange?: (open: boolean) => void;
  variant?: "full" | "minimal";
}) => {
  const [internalEditOpen, setInternalEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const isMinimal = variant === "minimal";
  const isEditControlled =
    editOpenControlled !== undefined &&
    onEditOpenChangeControlled !== undefined;
  const isEditOpen = isEditControlled ? editOpenControlled : internalEditOpen;
  const setEditOpen = isEditControlled
    ? onEditOpenChangeControlled
    : setInternalEditOpen;
  const deleteMutation = useDeleteGroupMutation({
    onSuccess: async () => {
      setIsDeleteOpen(false);
      await onDeleted?.();
    },
  });

  const handleConfirmDelete = () => {
    deleteMutation.mutate({ id: group.id });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" type="button">
              <span className="sr-only">Open menu for {group.name}</span>
              <MoreVertical className="h-4 w-4" aria-hidden />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3">
                <GroupPlayerAvatarStack
                  players={group.players}
                  size="md"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="block truncate font-medium leading-tight">
                    {group.name}
                  </span>
                  <span className="text-muted-foreground block text-xs leading-tight">
                    {group.matches} match{group.matches === 1 ? "" : "es"} ·{" "}
                    {group.players.length} member
                    {group.players.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isMinimal ? (
              <DropdownMenuItem
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-2"
              >
                <PencilIcon className="size-4 shrink-0" aria-hidden />
                Edit group
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem
                  render={
                    <Link
                      href={`/dashboard/groups/${group.id}`}
                      prefetch={true}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="size-4 shrink-0" aria-hidden />
                      Open group
                    </Link>
                  }
                />
                <DropdownMenuItem
                  onClick={() => setEditOpen(true)}
                  className="flex items-center gap-2"
                >
                  <PencilIcon className="size-4 shrink-0" aria-hidden />
                  Edit group
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive flex items-center gap-2 data-highlighted:bg-destructive data-highlighted:!text-white data-highlighted:[&_svg]:!text-white"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2Icon className="size-4 shrink-0" aria-hidden />
              Delete group
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {!isEditControlled && (
        <EditGroupDialog
          group={{
            id: group.id,
            name: group.name,
            players: group.players,
          }}
          open={isEditOpen}
          onOpenChange={setEditOpen}
        />
      )}

      <ConfirmDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={`Delete “${group.name}”?`}
        description="This cannot be undone. The group will be removed; matches are not deleted."
        confirmLabel="Delete group"
        onConfirm={handleConfirmDelete}
        isConfirming={deleteMutation.isPending}
      />
    </>
  );
};
