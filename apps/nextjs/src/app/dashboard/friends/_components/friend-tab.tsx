"use client";

import { useState } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Mail, Search, UserPlus } from "lucide-react";

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
import { Input } from "@board-games/ui/input";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";

import { useTRPC } from "~/trpc/react";
import { FriendCard } from "./friend-card";
import { FriendRequestCard } from "./friend-request-card";

export function FriendsList() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");

  const { data: pendingRequests } = useSuspenseQuery(
    trpc.friend.getFriendRequests.queryOptions(),
  );
  const { data: sentFriendRequests } = useSuspenseQuery(
    trpc.friend.getSentFriendRequests.queryOptions(),
  );
  const { data: friends } = useSuspenseQuery(
    trpc.friend.getFriends.queryOptions(),
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

  const filteredFriends = friends.filter(
    (friend) =>
      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Tabs defaultValue="friends">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="friends">My Friends</TabsTrigger>
        <TabsTrigger value="requests">
          Friend Requests
          {pendingRequests.length > 0 && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {pendingRequests.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="sent">
          Sent Requests
          {sentFriendRequests.length > 0 && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {sentFriendRequests.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="friends" className="space-y-4 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search friends..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {filteredFriends.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <UserPlus className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No friends found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchQuery
                  ? "Try a different search term"
                  : "Add some friends to get started"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[68vh] sm:h-[75vh]">
            <div className="grid gap-4 md:grid-cols-2">
              {filteredFriends.map((friend) => (
                <FriendCard
                  key={friend.id}
                  id={friend.id}
                  name={friend.name}
                  email={friend.email ?? undefined}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </TabsContent>

      <TabsContent value="requests" className="space-y-4 pt-4">
        {pendingRequests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Mail className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No pending requests</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                You don't have any friend requests at the moment
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[68vh] sm:h-[75vh]">
            <div className="grid gap-4 md:grid-cols-2">
              {pendingRequests.map((request) => (
                <FriendRequestCard
                  key={request.id}
                  id={request.id}
                  name={request.user.name ?? "Unknown"}
                  email={request.user.email ?? undefined}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </TabsContent>
      <TabsContent value="sent" className="space-y-4 pt-4">
        {sentFriendRequests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Mail className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">
                No pending sent requests
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                You haven't sent any friend requests that are still pending
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[68vh] sm:h-[75vh]">
            <div className="grid gap-4 md:grid-cols-2">
              {sentFriendRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <CardTitle>{request.requestee.name}</CardTitle>
                    <CardDescription>{request.requestee.email}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Sent on {new Date(request.createdAt).toLocaleDateString()}{" "}
                      at{" "}
                      {new Date(request.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        cancelFriendRequestMutation.mutate({
                          requestId: request.id,
                        })
                      }
                    >
                      Cancel Request
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </TabsContent>
    </Tabs>
  );
}
