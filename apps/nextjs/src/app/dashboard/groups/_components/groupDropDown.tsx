"use client";

import { useState } from "react";
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

import { api } from "~/trpc/react";
import { EditGroupDialog } from "./editGroupDialog";

export function GroupDropDown({
  data,
}: {
  data: RouterOutputs["group"]["getGroups"][number];
}) {
  const utils = api.useUtils();
  const deleteGroup = api.group.deleteGroup.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.group.getGroups.invalidate()]);
    },
  });
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
