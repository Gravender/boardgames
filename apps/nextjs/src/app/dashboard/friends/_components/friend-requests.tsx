"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Check, UserPlus, X } from "lucide-react";

import { Avatar, AvatarFallback } from "@board-games/ui/avatar";
import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { useToast } from "@board-games/ui/hooks/use-toast";

import { useTRPC } from "~/trpc/react";

export function FriendRequests() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: pendingRequests } = useSuspenseQuery(
    trpc.friend.getFriendRequests.queryOptions(),
  );

  const acceptRequestMutation = useMutation(
    trpc.friend.acceptFriendRequest.mutationOptions({
      onSuccess: async () => {
        toast({
          title: "Friend request accepted",
        });
        await queryClient.invalidateQueries(
          trpc.friend.getFriendRequests.queryOptions(),
        );
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

  const rejectRequestMutation = useMutation(
    trpc.friend.rejectFriendRequest.mutationOptions({
      onSuccess: async () => {
        toast({
          title: "Friend request rejected",
        });
        await queryClient.invalidateQueries(
          trpc.friend.getFriendRequests.queryOptions(),
        );
        await queryClient.invalidateQueries(
          trpc.friend.getFriends.queryOptions(),
        );
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to reject friend request",
          variant: "destructive",
        });
      },
    }),
  );

  if (pendingRequests.length === 0) {
    return (
      <div className="rounded-lg bg-muted/50 py-8 text-center">
        <UserPlus className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
        <h3 className="mt-4 text-lg font-medium">No pending friend requests</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          When someone sends you a friend request, it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {pendingRequests.map((request) => (
        <Card key={request.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarFallback>{request.user.name}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">{request.user.name}</CardTitle>
                <CardDescription>{request.user.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <p className="text-sm text-muted-foreground">
              This user would like to be your friend
            </p>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                rejectRequestMutation.mutate({ requestId: request.id })
              }
              disabled={
                rejectRequestMutation.isPending ||
                acceptRequestMutation.isPending
              }
            >
              <X className="mr-2 h-4 w-4" />
              Decline
            </Button>
            <Button
              size="sm"
              onClick={() =>
                acceptRequestMutation.mutate({ requestId: request.id })
              }
              disabled={
                rejectRequestMutation.isPending ||
                acceptRequestMutation.isPending
              }
            >
              <Check className="mr-2 h-4 w-4" />
              Accept
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
