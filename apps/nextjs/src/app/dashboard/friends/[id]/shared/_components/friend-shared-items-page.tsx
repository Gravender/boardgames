"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import { Card, CardHeader, CardTitle } from "@board-games/ui/card";

import { useTRPC } from "~/trpc/react";
import { FriendSharedItems } from "./friend-shared-items";

export function FriendSharedItemsPage({ friendId }: { friendId: number }) {
  const trpc = useTRPC();

  const { data: friend } = useSuspenseQuery(
    trpc.friend.getFriend.queryOptions({ friendId: friendId }),
  );

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage
              src={friend.clerkUser.imageUrl}
              alt={friend.clerkUser.name}
            />
            <AvatarFallback>
              {(friend.clerkUser.name.split(" ")[0]?.substring(0, 1) ?? "") +
                friend.clerkUser.name.split(" ")[1]?.substring(0, 1)}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{friend.clerkUser.name}</CardTitle>
            <p className="text-sm text-muted-foreground">Shared Items</p>
          </div>
        </CardHeader>
      </Card>

      <FriendSharedItems
        sharedWith={friend.sharedWith}
        sharedTo={friend.sharedTo}
      />
    </div>
  );
}
