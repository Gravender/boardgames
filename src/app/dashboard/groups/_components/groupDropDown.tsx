"use client";

import { startTransition, useState } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Dialog, DialogTrigger } from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { deleteGroup } from "~/server/queries";
import { type RouterOutputs } from "~/trpc/react";

import { EditGroupDialog } from "./editGroupDialog";

export function GroupDropDown({
  data,
}: {
  data: RouterOutputs["group"]["getGroups"][number];
}) {
  const onDelete = () => {
    startTransition(async () => {
      await deleteGroup({ id: data.id });
    });
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
