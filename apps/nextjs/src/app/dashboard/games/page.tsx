import { Suspense } from "react";

import GamesList from "~/components/game/list";
import { GamesListSkeleton } from "~/components/game/skeleton/list-skeleton";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ add?: string }>;
}) {
  const addGame = (await searchParams).add === "true";
  void prefetch(trpc.game.getGames.queryOptions());
  return (
    <HydrateClient>
      <div className="container flex items-center justify-center px-4 md:px-6">
        <div className="relative h-[90vh] w-full max-w-3xl px-1 sm:px-4">
          <Suspense fallback={<GamesListSkeleton />}>
            <GamesList defaultIsOpen={addGame} />
          </Suspense>
        </div>
      </div>
    </HydrateClient>
  );
}
