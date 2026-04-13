import { Suspense } from "react";

import PlayersList from "~/components/player/list";
import { PlayersListSkeleton } from "~/components/player/skeleton/players-list-skeleton";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";

export function generateMetadata() {
  return {
    title: "Players",
    icons: [{ rel: "icon", url: "/users.ico" }],
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ add?: string }>;
}) {
  void prefetch(trpc.player.getPlayers.queryOptions());
  const addPlayer = (await searchParams).add === "true";
  return (
    <HydrateClient>
      <div className="container flex items-center justify-center px-4 md:px-6">
        <div className="relative h-[90vh] w-full max-w-3xl px-1 sm:px-4">
          <Suspense fallback={<PlayersListSkeleton />}>
            <PlayersList defaultAddOpen={addPlayer} />
          </Suspense>
        </div>
      </div>
    </HydrateClient>
  );
}
