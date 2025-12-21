import { Suspense } from "react";

import { AddGameDialog } from "~/components/game/add";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { GamesData } from "./_components/games-list";
import { GamesListSkeleton } from "./_components/games-list-skeleton";

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
            <GamesData />
          </Suspense>
          <div className="absolute right-6 bottom-4 z-10 sm:right-10">
            <AddGameDialog defaultIsOpen={addGame} />
          </div>
        </div>
      </div>
    </HydrateClient>
  );
}
