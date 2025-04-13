"use client";

import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { GamepadIcon as GameController } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
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

  const sharedByItems: (
    | (RouterOutputs["friend"]["getFriend"]["friend"]["sharedPlayersOwner"][number] & {
        type: "player";
      })
    | (RouterOutputs["friend"]["getFriend"]["friend"]["sharedGamesOwner"][number] & {
        type: "game";
      })
  )[] = useMemo(() => {
    return [
      ...friend.friend.sharedGamesOwner.map((gS) => ({
        ...gS,
        type: "game" as const,
      })),
      ...friend.friend.sharedPlayersOwner.map((pS) => ({
        ...pS,
        type: "player" as const,
      })),
    ];
  }, [friend]);
  const sharedWithItems: (
    | (RouterOutputs["friend"]["getFriend"]["user"]["sharedPlayersOwner"][number] & {
        type: "player";
      })
    | (RouterOutputs["friend"]["getFriend"]["user"]["sharedGamesOwner"][number] & {
        type: "game";
      })
  )[] = useMemo(() => {
    return [
      ...friend.user.sharedGamesOwner.map((gS) => ({
        ...gS,
        type: "game" as const,
      })),
      ...friend.user.sharedPlayersOwner.map((pS) => ({
        ...pS,
        type: "player" as const,
      })),
    ];
  }, [friend]);

  return (
    <div className="container max-w-4xl py-2">
      <div className="mb-2">
        <div className="flex">
          <div>
            <h1 className="text-3xl font-bold">{friend.friend.name}</h1>
            <p className="text-muted-foreground">{friend.friend.email}</p>
          </div>
        </div>
      </div>

      <Separator className="my-6" />

      <Tabs defaultValue="shared-by-friend">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="shared-by-friend">
            Shared by {friend.friend.name}
            {sharedByItems.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {sharedByItems.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="shared-with-friend">
            Shared with {friend.friend.name}
            {sharedWithItems.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {sharedWithItems.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shared-by-friend" className="space-y-4 pt-4">
          {sharedByItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <GameController className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No shared items</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {friend.friend.name} hasn't shared any games or players with
                  you yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[68vh] sm:h-[75vh]">
              <div className="grid gap-4">
                {sharedByItems.map((item) => {
                  if (item.type === "game") {
                    return <SharedGameCard key={item.id} game={item} />;
                  } else {
                    return <SharedPlayerCard key={item.id} player={item} />;
                  }
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="shared-with-friend" className="space-y-4 pt-4">
          {sharedWithItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <GameController className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No shared items</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  You haven't shared any games or players with{" "}
                  {friend.friend.name} yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[68vh] sm:h-[75vh]">
              <div className="grid gap-4">
                {sharedWithItems.map((item) => {
                  if (item.type === "game") {
                    return <SharedGameCard key={item.id} game={item} />;
                  } else {
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
