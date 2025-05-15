"use client";

import { redirect } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Clock, Trophy, Users } from "lucide-react";

import { formatDuration } from "@board-games/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";

import { useTRPC } from "~/trpc/react";

export function FriendStatsPage({ friendId }: { friendId: number }) {
  const trpc = useTRPC();

  const { data: friend } = useSuspenseQuery(
    trpc.friend.getFriend.queryOptions({ friendId: friendId }),
  );

  if (!friend.linkedPlayer) {
    redirect("/dashboard/friends");
    return null;
  }

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
            <p className="text-sm text-muted-foreground">Player Stats</p>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Player Statistics</CardTitle>
          <CardDescription>
            Game statistics for {friend.linkedPlayer.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col items-center justify-center rounded-lg border p-4">
              <Trophy className="mb-2 h-8 w-8 text-yellow-500" />
              <p className="text-2xl font-bold">{friend.linkedPlayer.wins}</p>
              <p className="text-sm text-muted-foreground">Wins</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Win Rate: {Math.round(friend.linkedPlayer.winRate * 100)}%
              </p>
            </div>

            <div className="flex flex-col items-center justify-center rounded-lg border p-4">
              <Users className="mb-2 h-8 w-8 text-blue-500" />
              <p className="text-2xl font-bold">
                {friend.linkedPlayer.players}
              </p>
              <p className="text-sm text-muted-foreground">Players</p>
            </div>

            <div className="flex flex-col items-center justify-center rounded-lg border p-4">
              <Clock className="mb-2 h-8 w-8 text-green-500" />
              <p className="text-2xl font-bold">
                {formatDuration(friend.linkedPlayer.duration)}
              </p>
              <p className="text-sm text-muted-foreground">Play Time</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
