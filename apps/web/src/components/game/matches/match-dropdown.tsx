"use client";

import { useState } from "react";
import { MatchLink } from "~/components/link";
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
import { Button } from "@board-games/ui/button";
import { buttonVariants } from "@board-games/ui/components/button-variants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@board-games/ui/dropdown-menu";

import { useTRPC } from "~/trpc/react";

type Matches = NonNullable<RouterOutputs["game"]["gameMatches"]>;
export function MatchDropdown({ match }: { match: Matches[number] }) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const deleteMatch = useMutation(
    trpc.match.deleteMatch.mutationOptions({
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
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {match.type === "original" && (
            <DropdownMenuItem
              render={
                <MatchLink
                  match={{
                    gameId: match.game.id,
                    matchId: match.id,
                    segment: "edit",
                  }}
                  className="flex items-center gap-2"
                >
                  <PencilIcon className="mr-2 h-4 w-4" />
                  Edit
                </MatchLink>
              }
            />
          )}
          {match.type === "shared" && match.permissions === "edit" && (
            <DropdownMenuItem
              render={
                <MatchLink
                  match={{
                    sharedGameId: match.game.sharedGameId,
                    sharedMatchId: match.id,
                    segment: "edit",
                  }}
                  className="flex items-center gap-2"
                >
                  <PencilIcon className="mr-2 h-4 w-4" />
                  Edit
                </MatchLink>
              }
            />
          )}
          <DropdownMenuItem
            render={
              match.type === "shared" ? (
                <MatchLink
                  match={{
                    sharedGameId: match.game.sharedGameId,
                    sharedMatchId: match.id,
                  }}
                  className="flex items-center gap-2"
                >
                  <Table className="mr-2 h-4 w-4" />
                  ScoreSheet
                </MatchLink>
              ) : (
                <MatchLink
                  match={{
                    gameId: match.game.id,
                    matchId: match.id,
                  }}
                  className="flex items-center gap-2"
                >
                  <Table className="mr-2 h-4 w-4" />
                  ScoreSheet
                </MatchLink>
              )
            }
          />
          {match.finished && (
            <DropdownMenuItem
              render={
                match.type === "shared" ? (
                  <MatchLink
                    match={{
                      sharedGameId: match.game.sharedGameId,
                      sharedMatchId: match.id,
                      segment: "summary",
                    }}
                    className="flex items-center gap-2"
                  >
                    <BookText className="mr-2 h-4 w-4" />
                    Summary
                  </MatchLink>
                ) : (
                  <MatchLink
                    match={{
                      gameId: match.game.id,
                      matchId: match.id,
                      segment: "summary",
                    }}
                    className="flex items-center gap-2"
                  >
                    <BookText className="mr-2 h-4 w-4" />
                    Summary
                  </MatchLink>
                )
              }
            />
          )}
          {match.type === "original" && (
            <>
              <DropdownMenuItem
                render={
                  <MatchLink
                    match={{
                      gameId: match.game.id,
                      matchId: match.id,
                      segment: "share",
                    }}
                    className="flex items-center gap-2"
                  >
                    <Link2Icon className="mr-2 h-4 w-4" />
                    Share
                  </MatchLink>
                }
              />
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
    </>
  );
}
