"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, X } from "lucide-react";

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

interface FriendRequestCardProps {
  id: number;
  name: string;
  email?: string;
}

export function FriendRequestCard({ id, name, email }: FriendRequestCardProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState<"accept" | "reject" | null>(null);

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

  const handleAccept = () => {
    setIsLoading("accept");
    acceptRequestMutation.mutate({
      requestId: id,
    });
  };

  const handleReject = () => {
    setIsLoading("reject");
    rejectRequestMutation.mutate({
      requestId: id,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{name}</CardTitle>
        {email && <CardDescription>{email}</CardDescription>}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {name} wants to be your friend
        </p>
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button
          variant="outline"
          className="w-full"
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
          className="w-full"
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
      </CardFooter>
    </Card>
  );
}
