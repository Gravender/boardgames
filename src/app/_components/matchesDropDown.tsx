"use client";

import { startTransition } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { deleteMatch } from "~/server/queries";
import { type RouterOutputs } from "~/trpc/react";

type Game = NonNullable<RouterOutputs["game"]["getGame"]>;
export function MatchDropDown({
  matchId,
  gameId,
}: {
  matchId: Game["matches"][number]["id"];
  gameId: Game["id"];
}) {
  const onDelete = () => {
    startTransition(async () => {
      await deleteMatch({ matchId, gameId });
    });
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
            <Link href={`/dashboard/games/${gameId}/${matchId}/edit`}>
              Edit
            </Link>
          </DropdownMenuItem>
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
