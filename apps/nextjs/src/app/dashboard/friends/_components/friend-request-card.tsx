"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDate } from "date-fns";
import { Check, Clock, Loader2, X } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import { Button } from "@board-games/ui/button";
import { Card, CardContent } from "@board-games/ui/card";
import { useToast } from "@board-games/ui/hooks/use-toast";

import { useTRPC } from "~/trpc/react";

interface FriendRequestCardProps {
  friendRequest: RouterOutputs["friend"]["getFriendRequests"][number];
  type: "received" | "sent";
}

export function FriendRequestCard({
  friendRequest,
  type,
}: FriendRequestCardProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState<
    "accept" | "reject" | "cancel" | null
  >(null);

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
        setIsLoading(null);
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
        setIsLoading(null);
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
  const cancelFriendRequestMutation = useMutation(
    trpc.friend.cancelFriendRequest.mutationOptions({
      onSuccess: async () => {
        toast({
          title: "Friend request canceled",
        });
        await queryClient.invalidateQueries(
          trpc.friend.getFriendRequests.queryOptions(),
        );
        await queryClient.invalidateQueries(
          trpc.friend.getFriends.queryOptions(),
        );
        setIsLoading(null);
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to cancel friend request",
          variant: "destructive",
        });
      },
    }),
  );

  const handleAccept = () => {
    setIsLoading("accept");
    acceptRequestMutation.mutate({
      requestId: friendRequest.id,
    });
  };

  const handleReject = () => {
    setIsLoading("reject");
    rejectRequestMutation.mutate({
      requestId: friendRequest.id,
    });
  };

  const handleCancel = () => {
    setIsLoading("cancel");
    cancelFriendRequestMutation.mutate({
      requestId: friendRequest.id,
    });
  };

  return (
    <Card className="flex flex-row">
      <CardContent className="w-full p-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={friendRequest.imageUrl ?? ""}
              alt={friendRequest.name}
            />
            <AvatarFallback>
              {friendRequest.name
                ? friendRequest.name.substring(0, 2).toUpperCase()
                : "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-grow">
            <p className="font-medium">{friendRequest.name}</p>
            <p className="flex items-center text-xs text-muted-foreground">
              <Clock className="mr-1 h-3 w-3" />
              {formatDate(friendRequest.createdAt, "P")}
            </p>
          </div>

          <div className="flex gap-2">
            {type === "received" ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReject}
                  disabled={isLoading !== null}
                >
                  {isLoading === "reject" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="mr-2 h-4 w-4" />
                  )}
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={handleAccept}
                  disabled={isLoading !== null}
                >
                  {isLoading === "accept" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Accept
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading !== null}
              >
                {isLoading === "cancel" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Cancel"
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
