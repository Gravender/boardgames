import { Suspense } from "react";

import { api, HydrateClient } from "~/trpc/server";
import { Games, GameSkeleton } from "./_components/games";

export default function Page() {
  void api.game.getGames.prefetch();
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <Suspense
          fallback={
            <div className="container relative mx-auto h-[90vh] max-w-3xl px-4">
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <GameSkeleton key={i} />
                ))}
              </div>
            </div>
          }
        >
          <Games />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
