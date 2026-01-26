import { Suspense } from "react";
import { redirect } from "next/navigation";

import { GameStatsSkeleton } from "~/components/game/stats/game-stats-skeleton";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import SharedGameStats from "./_components/shared-game-stats";

interface Props {
  params: Promise<{ id: string }>;
}
export default async function SharedGameStatsPage({ params }: Props) {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/games");
  void prefetch(trpc.sharing.getSharedGame.queryOptions({ id: Number(id) }));
  void prefetch(
    trpc.newGame.getGamePlayerStats.queryOptions({
      type: "shared",
      sharedGameId: Number(id),
    }),
  );
  return (
    <HydrateClient>
      <div className="container flex w-full items-center justify-center px-3 py-4 md:px-6 md:py-8">
        <Suspense fallback={<GameStatsSkeleton />}>
          <SharedGameStats gameId={Number(id)} />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
