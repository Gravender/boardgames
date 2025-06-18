"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { Card, CardHeader, CardTitle } from "@board-games/ui/card";

import { PlayerImage } from "~/components/player-image";
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
          <PlayerImage
            image={friend.clerkUser.image}
            alt={friend.clerkUser.name}
            className="size-16"
          />
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
