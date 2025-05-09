import { Suspense } from "react";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { AddGameDialog } from "./_components/addGameDialog";
import { GamesData } from "./_components/games-list";
import { GamesListSkeleton } from "./_components/games-list-skeleton";

export default function Page({
  searchParams,
}: {
  searchParams: { add?: string };
}) {
  void prefetch(trpc.game.getGames.queryOptions());
  const addGame = searchParams.add === "true";
  return (
    <HydrateClient>
      <div className="container flex items-center justify-center px-4 md:px-6">
        <div className="relative h-[90vh] w-full max-w-3xl px-1 sm:px-4">
          <Suspense fallback={<GamesListSkeleton />}>
            <GamesData />
          </Suspense>
          <div className="absolute bottom-4 right-6 z-10 sm:right-10">
            <AddGameDialog defaultIsOpen={addGame} />
          </div>
        </div>
      </div>
    </HydrateClient>
  );
}
