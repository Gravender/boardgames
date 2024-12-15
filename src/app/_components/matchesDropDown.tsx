"use client";

import { startTransition } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";

import { Button } from "~/components/ui/button";
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <Link href={`/dashboard/games/${gameId}/${matchId}/edit`}>
          <DropdownMenuItem>Edit</DropdownMenuItem>
        </Link>
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
