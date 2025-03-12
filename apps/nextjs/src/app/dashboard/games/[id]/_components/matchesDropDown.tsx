"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Button } from "@board-games/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@board-games/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@board-games/ui/dropdown-menu";

import { useTRPC } from "~/trpc/react";

type Game = NonNullable<RouterOutputs["game"]["getGame"]>;
export function MatchDropDown({
  match,
  gameId,
}: {
  match: Game["matches"][number];
  gameId: Game["id"];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const deleteMatch = useMutation(
    trpc.match.deleteMatch.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.game.getGames.queryOptions());
        await queryClient.invalidateQueries(
          trpc.game.getGame.queryOptions({ id: gameId }),
        );
        await queryClient.invalidateQueries(trpc.player.pathFilter());
        await queryClient.invalidateQueries(trpc.dashboard.pathFilter());
      },
    }),
  );
  const onDelete = () => {
    deleteMatch.mutate({ id: match.id });
  };
  return (
    <Dialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/games/${gameId}/${match.id}/edit`}>
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/games/${gameId}/${match.id}`}>
              ScoreSheet
            </Link>
          </DropdownMenuItem>
          {match.finished && (
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/games/${gameId}/${match.id}/summary`}>
                Summary
              </Link>
            </DropdownMenuItem>
          )}
          <DialogTrigger asChild>
            <DropdownMenuItem className="text-destructive focus:bg-destructive/80 focus:text-destructive-foreground">
              Delete
            </DropdownMenuItem>
          </DialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your
            match.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button type="button">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
