"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";

import { Avatar, AvatarFallback } from "@board-games/ui/avatar";
import { Badge } from "@board-games/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";

import { useTRPC } from "~/trpc/react";

export function FriendsList() {
  const trpc = useTRPC();
  const { data: friends } = useSuspenseQuery(
    trpc.friend.getFriends.queryOptions(),
  );

  if (friends.length === 0) {
    return (
      <div className="rounded-lg bg-muted/50 py-8 text-center">
        <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
        <h3 className="mt-4 text-lg font-medium">No friends yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Send friend requests to connect with other users.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {friends.map((friend) => (
        <Card key={friend.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarFallback>{friend.friend.name}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">
                  {friend.friend.name}
                </CardTitle>
                <CardDescription>{friend.friend.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-primary/10">
                Connected
              </Badge>
              <span className="text-xs text-muted-foreground">
                Since {friend.friend.createdAt.toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
