import { Suspense } from "react";

import { FriendsList } from "./_components/friend-tab";

export default function FriendsPage() {
  return (
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
  );
}
