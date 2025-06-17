"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical } from "lucide-react";

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
import { Dialog, DialogTrigger } from "@board-games/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@board-games/ui/dropdown-menu";

import { useTRPC } from "~/trpc/react";
import { EditPlayerDialog } from "./editPlayerDialog";

export function PlayerDropDown({
  data,
}: {
  data: RouterOutputs["player"]["getPlayers"][number];
}) {
  const [isDeletePlayerDialogOpen, setIsDeletePlayerDialogOpen] =
    useState(false);
  const [isEditPlayerOpen, setIsEditPlayerOpen] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const deletePlayer = useMutation(
    trpc.player.deletePlayer.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.player.getPlayers.queryOptions()),
          queryClient.invalidateQueries(trpc.dashboard.pathFilter()),
          queryClient.invalidateQueries(trpc.game.pathFilter()),
          queryClient.invalidateQueries(trpc.group.pathFilter()),
          queryClient.invalidateQueries(trpc.match.pathFilter()),
        ]);
      },
    }),
  );
  const onDelete = () => {
    deletePlayer.mutate({ id: data.id });
  };

  const canEdit =
    data.type === "original" ||
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    (data.type === "shared" && data.permissions === "edit");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit && (
            <DialogTrigger asChild>
              <DropdownMenuItem>Edit</DropdownMenuItem>
            </DialogTrigger>
          )}
          <DropdownMenuItem asChild>
            <Link
              href={`/dashboard/players${data.type === "original" ? "/" : "/shared/"}${data.id}/stats`}
            >
              Stats
            </Link>
          </DropdownMenuItem>
          {data.type === "original" && (
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/80 focus:text-destructive-foreground"
              onClick={() => setIsDeletePlayerDialogOpen(true)}
            >
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={isEditPlayerOpen} onOpenChange={setIsEditPlayerOpen}>
        <EditPlayerDialog player={data} setOpen={setIsEditPlayerOpen} />
      </Dialog>
      <AlertDialog
        open={isDeletePlayerDialogOpen}
        onOpenChange={setIsDeletePlayerDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {`Are you absolutely sure you want to delete ${data.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              player.
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
