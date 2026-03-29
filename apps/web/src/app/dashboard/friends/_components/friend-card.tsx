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
import { Button } from "@board-games/ui/button";
import { Card, CardContent } from "@board-games/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@board-games/ui/dropdown-menu";
import { toast } from "@board-games/ui/toast";

import { PlayerImage } from "~/components/player-image";
import { useTRPC } from "~/trpc/react";

interface FriendCardProps {
  friend: RouterOutputs["friend"]["getFriends"][number];
}

export function FriendCard({ friend }: FriendCardProps) {
  const [unFriendDialogOpen, setUnfriendDialogOpen] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const unFriendMutation = useMutation(
    trpc.friend.unFriend.mutationOptions({
      onSuccess: async () => {
        toast("Friend removed", {
          description: "This person has been removed from your friends list",
        });
        await queryClient.invalidateQueries(
          trpc.friend.getFriends.queryOptions(),
        );
        await queryClient.invalidateQueries(
          trpc.friend.getFriend.queryOptions({ friendId: friend.id }),
        );
      },
      onError: (error) => {
        toast.error("Error", {
          description: error.message || "Failed to accept friend request",
        });
        throw new Error(error.message);
      },
    }),
  );

  const handleUnFriend = () => {
    unFriendMutation.mutate({
      friendId: friend.id,
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <Link
            prefetch={true}
            href={`/dashboard/friends/${friend.id}`}
            className="flex items-center gap-4"
          >
            <PlayerImage
              image={friend.image}
              alt={friend.name}
              className="size-10"
            />

            <div className="flex-grow">
              <p className="font-medium">{friend.name}</p>
              <p className="text-muted-foreground text-xs">
                {friend.userName ? `@${friend.userName}` : friend.email}
              </p>
            </div>
          </Link>

          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/friends/${friend.id}`}>
                    View Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-500 focus:bg-red-50 focus:text-red-500"
                  onClick={() => setUnfriendDialogOpen(true)}
                >
                  Unfriend
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
      <AlertDialog
        open={unFriendDialogOpen}
        onOpenChange={setUnfriendDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {friend.name} from your friends list. They will
              need to send you a new friend request to connect again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleUnFriend()}
              className="bg-red-500 hover:bg-red-600"
            >
              Unfriend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
