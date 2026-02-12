import { Suspense } from "react";
import { redirect } from "next/navigation";

import GameStats from "~/components/game/stats/game-stats";
import { GameStatsSkeleton } from "~/components/game/stats/game-stats-skeleton";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";

interface Props {
  params: Promise<{ id: string }>;
}
export default async function SharedGameStatsPage({ params }: Props) {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/games");
  const sharedGameId = Number(id);
  void prefetch(
    trpc.newGame.getGameScoresheetStats.queryOptions({
      type: "shared",
      sharedGameId,
    }),
  );
  void prefetch(
    trpc.newGame.getGameStatsHeader.queryOptions({
      type: "shared",
      sharedGameId,
    }),
  );
  void prefetch(
    trpc.newGame.gameMatches.queryOptions({ type: "shared", sharedGameId }),
  );
  void prefetch(
    trpc.newGame.getGamePlayerStats.queryOptions({
      type: "shared",
      sharedGameId,
    }),
  );
  void prefetch(
    trpc.newGame.getGameInsights.queryOptions({
      type: "shared",
      sharedGameId,
    }),
  );
  return (
    <HydrateClient>
      <div className="container flex w-full items-center justify-center px-3 py-4 md:px-6 md:py-8">
        <Suspense fallback={<GameStatsSkeleton />}>
          <GameStats game={{ type: "shared", sharedGameId }} />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
