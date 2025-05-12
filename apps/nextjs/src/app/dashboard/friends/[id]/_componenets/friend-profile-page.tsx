"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { GamepadIcon as GameController } from "lucide-react";

import { Card, CardContent } from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Separator } from "@board-games/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";

import { useTRPC } from "~/trpc/react";
import { SharedGameCard } from "./shared-game-card";
import { SharedPlayerCard } from "./shared-player-card";

export default function FriendProfilePage({ friendId }: { friendId: number }) {
  const trpc = useTRPC();

  const { data: friend } = useSuspenseQuery(
    trpc.friend.getFriend.queryOptions({ friendId: friendId }),
  );

  return (
    <div className="container max-w-4xl py-2">
      <div className="mb-2">
        <div className="flex">
          <div>
            <h1 className="text-3xl font-bold">{`${friend.clerkUser.firstName} ${friend.clerkUser.lastName}`}</h1>
            <p className="text-muted-foreground">
              @{friend.clerkUser.username}
            </p>
          </div>
        </div>
      </div>

      <Separator className="my-6" />

      <Tabs defaultValue="shared-by-friend">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="shared-by-friend">
            Shared by{" "}
            {`${friend.clerkUser.firstName} ${friend.clerkUser.lastName}`}
            {friend.sharedTo.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {friend.sharedTo.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="shared-with-friend">
            Shared with{" "}
            {`${friend.clerkUser.firstName} ${friend.clerkUser.lastName}`}
            {friend.sharedWith.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {friend.sharedWith.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shared-by-friend" className="space-y-4 pt-4">
          {friend.sharedTo.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <GameController className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No shared items</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {`${friend.clerkUser.firstName} ${friend.clerkUser.lastName}`}{" "}
                  hasn't shared any games or players with you yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[68vh] sm:h-[75vh]">
              <div className="grid gap-4">
                {friend.sharedTo.map((item) => {
                  if (item.type === "game") {
                    return <SharedGameCard key={item.id} game={item} />;
                  } else if (item.type === "player") {
                    return <SharedPlayerCard key={item.id} player={item} />;
                  }
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="shared-with-friend" className="space-y-4 pt-4">
          {friend.sharedWith.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <GameController className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No shared items</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  You haven't shared any games or players with{" "}
                  {`${friend.clerkUser.firstName} ${friend.clerkUser.lastName}`}{" "}
                  yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[68vh] sm:h-[75vh]">
              <div className="grid gap-4">
                {friend.sharedWith.map((item) => {
                  if (item.type === "game") {
                    return <SharedGameCard key={item.id} game={item} />;
                  } else if (item.type === "player") {
                    return <SharedPlayerCard key={item.id} player={item} />;
                  }
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
