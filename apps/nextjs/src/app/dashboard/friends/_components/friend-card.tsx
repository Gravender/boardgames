"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical } from "lucide-react";

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@board-games/ui/dropdown-menu";
import { useToast } from "@board-games/ui/hooks/use-toast";

import { useTRPC } from "~/trpc/react";

interface FriendCardProps {
  id: number;
  name: string;
  email?: string;
}

export function FriendCard({ id, name, email }: FriendCardProps) {
  const [unFriendDialogOpen, setUnfriendDialogOpen] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const unFriendMutation = useMutation(
    trpc.friend.unFriend.mutationOptions({
      onSuccess: async () => {
        toast({
          title: "Friend removed",
          description: "This person has been removed from your friends list",
        });
        await queryClient.invalidateQueries(
          trpc.friend.getFriends.queryOptions(),
        );
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to accept friend request",
          variant: "destructive",
        });
      },
    }),
  );

  const handleUnFriend = () => {
    unFriendMutation.mutate({
      friendId: id,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{name}</CardTitle>
          <CardDescription>{email}</CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-red-500 focus:bg-red-50 focus:text-red-500"
              onClick={() => setUnfriendDialogOpen(true)}
            >
              Unfriend
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <AlertDialog
        open={unFriendDialogOpen}
        onOpenChange={setUnfriendDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {name} from your friends list. They will need to
              send you a new friend request to connect again.
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
