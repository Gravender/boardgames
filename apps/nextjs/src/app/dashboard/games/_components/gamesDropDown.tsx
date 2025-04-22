"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart2Icon,
  MoreVertical,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Button } from "@board-games/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@board-games/ui/dropdown-menu";

import { useTRPC } from "~/trpc/react";

export function GamesDropDown({
  data,
}: {
  data: RouterOutputs["game"]["getGames"][number];
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
        <Button variant="ghost" size="icon">
          <span className="sr-only">Open menu</span>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Game Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {data.type === "original" && (
          <DropdownMenuItem asChild>
            <Link
              href={`/dashboard/games/${data.id}/edit`}
              className="flex items-center justify-between gap-2"
            >
              <PencilIcon className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link
            href={
              data.type === "shared"
                ? `/dashboard/games/shared/${data.id}/stats`
                : `/dashboard/games/${data.id}/stats`
            }
            className="flex items-center justify-between gap-2"
          >
            <BarChart2Icon className="mr-2 h-4 w-4" />
            View Stats
          </Link>
        </DropdownMenuItem>
        {/* <DropdownMenuItem>
          <div className="flex items-center justify-between gap-2">
            <BookOpenIcon className="mr-2 h-4 w-4" />
            <span>View Rules</span>
          </div>
        </DropdownMenuItem> */}
        {data.type === "original" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/80 focus:text-destructive-foreground"
              onClick={onDelete}
            >
              <div className="flex items-center justify-between gap-2">
                <Trash2Icon className="mr-2 h-4 w-4" />
                <span>Delete Game</span>
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
