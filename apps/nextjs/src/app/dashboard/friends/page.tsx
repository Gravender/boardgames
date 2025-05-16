import { Suspense } from "react";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { AddFriendDialog } from "./_components/add-friend-dialog";
import { FriendsList } from "./_components/friend-list";
import { FriendsListSkeleton } from "./_components/friend-list-skeleton";
import { FriendRequestsSkeleton } from "./_components/friend-requests-skeleton";
import { FriendRequestsTabs } from "./_components/friend-requests-tabs";

// eslint-disable-next-line @typescript-eslint/require-await
export default async function FriendsPage() {
  prefetch(trpc.friend.getFriends.queryOptions());
  prefetch(trpc.friend.getFriendRequests.queryOptions());
  prefetch(trpc.friend.getSentFriendRequests.queryOptions());
  return (
    <HydrateClient>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold">Friends</h1>
            <p className="text-muted-foreground">
              Manage your friends and friend requests
            </p>
          </div>
          <AddFriendDialog />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Suspense fallback={<FriendsListSkeleton />}>
              <FriendsList />
            </Suspense>
          </div>

          <div>
            <Suspense fallback={<FriendRequestsSkeleton />}>
              <FriendRequestsTabs />
            </Suspense>
          </div>
        </div>
      </div>
    </HydrateClient>
  );
}
