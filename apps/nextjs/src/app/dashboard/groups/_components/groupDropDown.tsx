"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Button } from "@board-games/ui/button";
import { Dialog, DialogTrigger } from "@board-games/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@board-games/ui/dropdown-menu";

import { useTRPC } from "~/trpc/react";
import { EditGroupDialog } from "./editGroupDialog";

export function GroupDropDown({
  data,
}: {
  data: RouterOutputs["group"]["getGroups"][number];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const deleteGroup = useMutation(
    trpc.group.deleteGroup.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.group.getGroups.queryOptions(),
        );
      },
    }),
  );
  const onDelete = () => {
    deleteGroup.mutate({ id: data.id });
  };
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DialogTrigger asChild>
            <DropdownMenuItem>Edit</DropdownMenuItem>
          </DialogTrigger>
          <DropdownMenuItem
            className="text-destructive focus:bg-destructive/80 focus:text-destructive-foreground"
            onClick={onDelete}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditGroupDialog group={data} setOpen={setIsOpen} />
    </Dialog>
  );
}
