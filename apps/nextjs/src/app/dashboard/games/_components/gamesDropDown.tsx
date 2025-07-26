"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart2Icon,
  Link2Icon,
  MoreVertical,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@board-games/ui/alert-dialog";
import { Button, buttonVariants } from "@board-games/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@board-games/ui/dropdown-menu";

import {
  useInvalidateEditGame,
  useInvalidateGames,
} from "~/hooks/invalidate/game";
import { useTRPC } from "~/trpc/react";

export function GamesDropDown({
  data,
}: {
  data: RouterOutputs["game"]["getGames"][number];
}) {
  const [isDeleteGameDialogOpen, setIsDeleteGameDialogOpen] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invalidateEditGame = useInvalidateEditGame();
  const invalidateGames = useInvalidateGames();
  const deleteGame = useMutation(
    trpc.game.deleteGame.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          ...invalidateEditGame(data.id, data.type),
          ...invalidateGames(),
          queryClient.invalidateQueries(trpc.player.pathFilter()),
          queryClient.invalidateQueries(trpc.dashboard.pathFilter()),
        ]);
      },
    }),
  );
  const onDelete = () => {
    deleteGame.mutate({ id: data.id });
  };
  return (
    <>
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

          <DropdownMenuItem asChild>
            <Link
              prefetch={true}
              href={`/dashboard/games/${data.type === "shared" ? "shared/" : ""}${data.id}/edit`}
              className="flex items-center gap-2"
            >
              <PencilIcon className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              prefetch={true}
              href={
                data.type === "shared"
                  ? `/dashboard/games/shared/${data.id}/stats`
                  : `/dashboard/games/${data.id}/stats`
              }
              className="flex items-center gap-2"
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
              <DropdownMenuItem asChild>
                <Link
                  prefetch={true}
                  href={`/dashboard/games/${data.id}/share`}
                  className="flex items-center gap-2"
                >
                  <Link2Icon className="mr-2 h-4 w-4" />
                  Share
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/80 focus:text-destructive-foreground"
                onClick={() => setIsDeleteGameDialogOpen(true)}
              >
                <div className="flex items-center gap-2">
                  <Trash2Icon className="mr-2 h-4 w-4" />
                  <span>Delete Game</span>
                </div>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog
        open={isDeleteGameDialogOpen}
        onOpenChange={setIsDeleteGameDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {`Are you absolutely sure you want to delete ${data.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              match.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => onDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
