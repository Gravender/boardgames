"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Button } from "@board-games/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@board-games/ui/dropdown-menu";

import { useTRPC } from "~/trpc/react";

export function GamesDropDown({
  data,
}: {
  data: RouterOutputs["game"]["getGames"][0];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const deleteGame = useMutation(
    trpc.game.deleteGame.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.game.getGames.queryOptions());
        await queryClient.invalidateQueries(
          trpc.player.getPlayers.queryOptions(),
        );
        await queryClient.invalidateQueries(trpc.dashboard.pathFilter());
      },
    }),
  );
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
