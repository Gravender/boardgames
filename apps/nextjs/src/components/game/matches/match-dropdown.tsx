"use client";

import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@board-games/ui/dropdown-menu";

import { EditSharedMatchForm } from "~/app/dashboard/games/_components/edit-shared-match-dialog-content";
import { useTRPC } from "~/trpc/react";

type Matches = NonNullable<RouterOutputs["newGame"]["gameMatches"]>;
export function MatchDropdown({ match }: { match: Matches[number] }) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSharingEditDialog, setIsSharingEditDialogOpen] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const deleteMatch = useMutation(
    trpc.newMatch.deleteMatch.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        setIsDeleteDialogOpen(false);
      },
    }),
  );
  const onDelete = () => {
    deleteMatch.mutate({ id: match.id });
  };
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {match.type === "original" && (
            <DropdownMenuItem asChild>
              <Link
                prefetch={true}
                href={`/dashboard/games/${match.game.id}/${match.id}/edit`}
                className="flex items-center gap-2"
              >
                <PencilIcon className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
          )}
          {match.type === "shared" && match.permissions === "edit" && (
            <DropdownMenuItem onClick={() => setIsSharingEditDialogOpen(true)}>
              <PencilIcon className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link
              prefetch={true}
              href={
                match.type === "shared"
                  ? `/dashboard/games/shared/${match.game.sharedGameId}/${match.id}`
                  : `/dashboard/games/${match.game.id}/${match.id}`
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
                prefetch={true}
                href={
                  match.type === "shared"
                    ? `/dashboard/games/shared/${match.game.sharedGameId}/${match.id}/summary`
                    : `/dashboard/games/${match.game.id}/${match.id}/summary`
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
                  prefetch={true}
                  href={`/dashboard/games/${match.game.id}/${match.id}/share`}
                  className="flex items-center gap-2"
                >
                  <Link2Icon className="mr-2 h-4 w-4" />
                  Share
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/80 focus:text-destructive-foreground flex items-center gap-2"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={deleteMatch.isPending}
              >
                <Trash2Icon className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{`Are you absolutely sure you want to delete ${match.name}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              match.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={onDelete}
              disabled={deleteMatch.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {match.type === "shared" && match.permissions === "edit" && (
        <Dialog
          open={isSharingEditDialog}
          onOpenChange={setIsSharingEditDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit {match.name}</DialogTitle>
            </DialogHeader>
            <EditSharedMatchForm
              match={match}
              setIsOpen={setIsSharingEditDialogOpen}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
