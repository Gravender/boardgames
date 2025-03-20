import { Suspense } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";

import { FriendRequests } from "./_components/friend-requests";
import { FriendsList } from "./_components/friends-list";

export default function FriendsPage() {
  return (
    <div className="container py-10">
      <h1 className="mb-6 text-3xl font-bold">Friends Management</h1>

      <div className="grid gap-8 md:grid-cols-[1fr_300px]">
        <div>
          <Tabs defaultValue="friends" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="friends">My Friends</TabsTrigger>
              <TabsTrigger value="requests">Friend Requests</TabsTrigger>
            </TabsList>
            <TabsContent value="friends">
              <Suspense fallback={<div>Loading friends...</div>}>
                <FriendsList />
              </Suspense>
            </TabsContent>
            <TabsContent value="requests">
              <Suspense fallback={<div>Loading requests...</div>}>
                <FriendRequests />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
