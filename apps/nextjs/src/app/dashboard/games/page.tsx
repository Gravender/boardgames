import { Suspense } from "react";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { AddGameDialog } from "./_components/addGameDialog";
import { GamesData } from "./_components/games-list";
import { GamesListSkeleton } from "./_components/games-list-skeleton";

export default function Page() {
  void prefetch(trpc.game.getGames.queryOptions());
  return (
    <HydrateClient>
      <div className="container flex items-center justify-center px-4 md:px-6">
        <div className="relative h-[90vh] w-full max-w-3xl px-1 sm:px-4">
          <Suspense fallback={<GamesListSkeleton />}>
            <GamesData />
          </Suspense>
          <div className="absolute bottom-4 right-6 z-10 sm:right-10">
            <AddGameDialog />
          </div>
        </div>
      </div>
    </HydrateClient>
  );
}
