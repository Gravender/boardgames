"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookText,
  Link2Icon,
  MoreVertical,
  PencilIcon,
  Table,
  Trash2Icon,
} from "lucide-react";

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
  DropdownMenuSeparator,
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
  //TODO add shared match support
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
          {match.type === "original" && (
            <DropdownMenuItem asChild>
              <Link
                href={`/dashboard/games/${gameId}/${match.id}/edit`}
                className="flex items-center gap-2"
              >
                <PencilIcon className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link
              href={
                match.type === "shared"
                  ? `/dashboard/games/shared/${match.gameId}/${match.id}`
                  : `/dashboard/games/${gameId}/${match.id}`
              }
              className="flex items-center gap-2"
            >
              <Table className="mr-2 h-4 w-4" />
              ScoreSheet
            </Link>
          </DropdownMenuItem>
          {match.finished && (
            <DropdownMenuItem asChild>
              <Link
                href={
                  match.type === "shared"
                    ? `/dashboard/games/shared/${match.gameId}/${match.id}/summary`
                    : `/dashboard/games/${gameId}/${match.id}/summary`
                }
                className="flex items-center gap-2"
              >
                <BookText className="mr-2 h-4 w-4" />
                Summary
              </Link>
            </DropdownMenuItem>
          )}
          {match.type === "original" && (
            <>
              <DropdownMenuItem asChild>
                <Link
                  href={`/dashboard/games/${gameId}/${match.id}/share`}
                  className="flex items-center gap-2"
                >
                  <Link2Icon className="mr-2 h-4 w-4" />
                  Share
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DialogTrigger asChild>
                <DropdownMenuItem className="text-destructive focus:bg-destructive/80 focus:text-destructive-foreground">
                  <div className="flex items-center gap-2">
                    <Trash2Icon className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </div>
                </DropdownMenuItem>
              </DialogTrigger>
            </>
          )}
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
