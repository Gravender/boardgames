"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { Card, CardHeader, CardTitle } from "@board-games/ui/card";

import { PlayerImage } from "~/components/player-image";
import { useTRPC } from "~/trpc/react";
import { FriendSharedItems } from "./friend-shared-items";

export function FriendSharedItemsPage({ friendId }: { friendId: string }) {
  const trpc = useTRPC();

  const { data: friend } = useSuspenseQuery(
    trpc.friend.getFriend.queryOptions({ friendId: friendId }),
  );

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <PlayerImage
            image={friend.image}
            alt={friend.name}
            className="size-16"
          />
          <div>
            <CardTitle>{friend.name}</CardTitle>
            <p className="text-muted-foreground text-sm">Shared Items</p>
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
