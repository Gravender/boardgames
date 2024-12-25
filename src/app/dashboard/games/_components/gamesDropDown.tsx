"use client";

import { startTransition } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { deleteGame } from "~/server/queries";
import { type RouterOutputs } from "~/trpc/react";

export function GamesDropDown({
  data,
}: {
  data: RouterOutputs["game"]["getGames"][0];
}) {
  const onDelete = () => {
    startTransition(async () => {
      await deleteGame({ id: data.id });
    });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/games/${data.id}/edit`}>Edit</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/games/${data.id}/stats`}>Stats</Link>
        </DropdownMenuItem>
        <DropdownMenuItem>Rules</DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:bg-destructive/80 focus:text-destructive-foreground"
          onClick={onDelete}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
