"use client";

import { startTransition } from "react";
import { MoreVertical } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { deleteGame } from "~/server/queries";
import { type RouterInputs, type RouterOutputs } from "~/trpc/react";

export function GamesDropDown({
  setEditGame,
  setOpen,
  data,
}: {
  setEditGame: (
    editGame:
      | (RouterInputs["game"]["updateGame"] & { image: string | null })
      | null,
  ) => void;
  setOpen: (isOpen: boolean) => void;
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
        <DropdownMenuItem
          onClick={() => {
            setEditGame({
              id: data.id,
              image: data.image,
              name: data.name,
              ownedBy: data.ownedBy,
              playersMin: data?.players?.min ?? null,
              playersMax: data?.players?.max ?? null,
              playtimeMin: data?.playtime?.min ?? null,
              playtimeMax: data?.playtime?.max ?? null,
              yearPublished: data.yearPublished ?? null,
            });
            setOpen(true);
          }}
        >
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem>Stats</DropdownMenuItem>
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