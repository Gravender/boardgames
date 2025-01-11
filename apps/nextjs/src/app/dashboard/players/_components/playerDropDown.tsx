"use client";

import { startTransition, useState } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";

import { Button } from "@board-games/ui/button";
import { Dialog, DialogTrigger } from "@board-games/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@board-games/ui/dropdown-menu";

import type { RouterOutputs } from "~/trpc/react";
import { deletePlayer } from "~/server/queries";
import { EditPlayerDialog } from "./editPlayerDialog";

export function PlayerDropDown({
  data,
}: {
  data: RouterOutputs["player"]["getPlayers"][number];
}) {
  const onDelete = () => {
    startTransition(async () => {
      await deletePlayer({ id: data.id });
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
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/players/${data.id}/stats`}>Stats</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:bg-destructive/80 focus:text-destructive-foreground"
            onClick={onDelete}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditPlayerDialog player={data} setOpen={setIsOpen} />
    </Dialog>
  );
}
