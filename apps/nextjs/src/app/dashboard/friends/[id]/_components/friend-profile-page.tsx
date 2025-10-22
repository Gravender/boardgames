"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BarChart2, Share2, UserX } from "lucide-react";

import { formatDuration } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";

import { PlayerImage } from "~/components/player-image";
import { useTRPC } from "~/trpc/react";
import { FriendSettingsDialog } from "./friend-settings-dialog";

export default function FriendProfilePage({ friendId }: { friendId: string }) {
  const trpc = useTRPC();

  const { data: friend } = useSuspenseQuery(
    trpc.friend.getFriend.queryOptions({ friendId: friendId }),
  );
  //TODO update to better auth user
  const hasLinkedPlayer = friend.linkedPlayer;
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <PlayerImage
            className="size-16"
            image={friend.image}
            alt={friend.name}
          />
          <div className="flex-grow">
            <CardTitle>{friend.name}</CardTitle>
            <p className="text-muted-foreground text-sm">
              {friend.username && `@${friend.username}`}
            </p>
          </div>
          <FriendSettingsDialog
            friendId={friend.friendId}
            initialSettings={friend.settings}
          />
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Button
              asChild
              className="flex h-auto flex-col items-center justify-center py-6"
            >
              <Link href={`/dashboard/friends/${friendId}/shared`}>
                <Share2 className="mb-2 h-8 w-8" />
                <span className="text-lg font-medium">Shared Items</span>
                <p className="text-muted-foreground mt-1 text-sm">
                  View items shared between you and your friend
                </p>
              </Link>
            </Button>

            {hasLinkedPlayer ? (
              <Button
                asChild
                className="flex h-auto flex-col items-center justify-center py-6"
              >
                <Link href={`/dashboard/friends/${friendId}/stats`}>
                  <BarChart2 className="mb-2 h-8 w-8" />
                  <span className="text-lg font-medium">Player Stats</span>
                  <p className="text-muted-foreground mt-1 text-sm">
                    View game statistics for this player
                  </p>
                </Link>
              </Button>
            ) : (
              <div className="bg-muted/50 flex h-auto flex-col items-center justify-center rounded-md border py-6">
                <UserX className="text-muted-foreground mb-2 h-8 w-8" />
                <span className="text-muted-foreground text-lg font-medium">
                  No Player Stats
                </span>
                <p className="text-muted-foreground mt-1 px-4 text-center text-sm">
                  This friend doesn't have a linked player account yet
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {hasLinkedPlayer && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Player Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                <p className="text-2xl font-bold">{friend.linkedPlayer.wins}</p>
                <p className="text-muted-foreground text-sm">Wins</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Win Rate: {Math.round(friend.linkedPlayer.winRate * 100)}%
                </p>
              </div>

              <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                <p className="text-2xl font-bold">
                  {friend.linkedPlayer.matches.length}
                </p>
                <p className="text-muted-foreground text-sm">Matches Played</p>
              </div>

              <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                <p className="text-2xl font-bold">
                  {friend.linkedPlayer.friendGames.length}
                </p>
                <p className="text-muted-foreground text-sm">Games Played</p>
              </div>

              <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                <p className="text-2xl font-bold">
                  {calculateHIndex(friend.linkedPlayer.friendGames)}
                </p>
                <p className="text-muted-foreground text-sm">H-Index</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Played h games at least h times
                </p>
              </div>

              <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                <p className="text-2xl font-bold">
                  {friend.linkedPlayer.players}
                </p>
                <p className="text-muted-foreground text-sm">Players</p>
              </div>

              <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                <p className="text-2xl font-bold">
                  {formatDuration(friend.linkedPlayer.duration)}
                </p>
                <p className="text-muted-foreground text-sm">Play Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
function calculateHIndex(games: { plays: number }[]): number {
  if (games.length === 0) return 0;

  // Sort games by number of plays in descending order
  const sortedPlays = [...games]
    .sort((a, b) => b.plays - a.plays)
    .map((game) => game.plays);

  // Find the h-index
  let hIndex = 0;
  for (let i = 0; i < sortedPlays.length; i++) {
    if (sortedPlays[i] ?? 0 >= i + 1) {
      hIndex = i + 1;
    } else {
      break;
    }
  }

  return hIndex;
}
