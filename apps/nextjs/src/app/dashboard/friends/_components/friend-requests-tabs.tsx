"use client";

import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { UserCheck, ClockIcon as UserClock } from "lucide-react";

import { Badge } from "@board-games/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";

import { useTRPC } from "~/trpc/react";
import { FriendRequestCard } from "./friend-request-card";

export function FriendRequestsTabs() {
  const [activeTab, setActiveTab] = useState("received");
  const trpc = useTRPC();
  const { data: pendingRequests } = useSuspenseQuery(
    trpc.friend.getFriendRequests.queryOptions(),
  );
  const { data: sentFriendRequests } = useSuspenseQuery(
    trpc.friend.getSentFriendRequests.queryOptions(),
  );

  return (
    <Tabs
      defaultValue="received"
      value={activeTab}
      onValueChange={setActiveTab}
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="received" className="flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          <span>Received</span>
          {pendingRequests.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {pendingRequests.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="sent" className="flex items-center gap-2">
          <UserClock className="h-4 w-4" />
          <span>Sent</span>
          {sentFriendRequests.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {sentFriendRequests.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="received">
        <Card>
          <CardHeader>
            <CardTitle>Friend Requests</CardTitle>
            <CardDescription>
              People who want to connect with you
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequests.length > 0 ? (
              <div className="max-h-[400px] space-y-4 overflow-y-auto pr-1">
                {pendingRequests.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    friendRequest={request}
                    type="received"
                  />
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-muted-foreground">
                No pending friend requests
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sent">
        <Card>
          <CardHeader>
            <CardTitle>Sent Requests</CardTitle>
            <CardDescription>Friend requests you've sent</CardDescription>
          </CardHeader>
          <CardContent>
            {sentFriendRequests.length > 0 ? (
              <div className="max-h-[400px] space-y-4 overflow-y-auto pr-1">
                {sentFriendRequests.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    friendRequest={request}
                    type="sent"
                  />
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-muted-foreground">
                No pending sent requests
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
