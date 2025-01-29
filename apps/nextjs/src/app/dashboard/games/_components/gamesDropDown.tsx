"use client";

import Link from "next/link";
import { MoreVertical } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Button } from "@board-games/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@board-games/ui/dropdown-menu";

import { api } from "~/trpc/react";

export function GamesDropDown({
  data,
}: {
  data: RouterOutputs["game"]["getGames"][0];
}) {
  const utils = api.useUtils();
  const deleteGame = api.game.deleteGame.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.game.getGames.invalidate(),
        utils.player.invalidate(),
        utils.dashboard.invalidate(),
      ]);
    },
  });
  const onDelete = () => {
    deleteGame.mutate({ id: data.id });
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
