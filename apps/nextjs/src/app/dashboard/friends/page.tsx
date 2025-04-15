import { Suspense } from "react";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { FriendsList } from "./_components/friend-tab";

// eslint-disable-next-line @typescript-eslint/require-await
export default async function FriendsPage() {
  prefetch(trpc.friend.getFriends.queryOptions());
  prefetch(trpc.friend.getFriendRequests.queryOptions());
  prefetch(trpc.friend.getSentFriendRequests.queryOptions());
  return (
    <HydrateClient>
      <div className="container max-w-4xl py-2">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Friends</h1>
            <p className="text-muted-foreground">
              Manage your friends and friend requests
            </p>
          </div>
        </div>

        <Suspense fallback={<div>Loading requests...</div>}>
          <FriendsList />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
