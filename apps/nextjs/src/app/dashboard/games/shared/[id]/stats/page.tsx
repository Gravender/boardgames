import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ErrorBoundary } from "react-error-boundary";

import { GameNotFound } from "~/components/game/not-found";
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
    trpc.game.getGameScoresheetStats.queryOptions({
      type: "shared",
      sharedGameId,
    }),
  );
  void prefetch(
    trpc.game.getGameStatsHeader.queryOptions({
      type: "shared",
      sharedGameId,
    }),
  );
  void prefetch(
    trpc.game.gameMatches.queryOptions({ type: "shared", sharedGameId }),
  );
  void prefetch(
    trpc.game.getGamePlayerStats.queryOptions({
      type: "shared",
      sharedGameId,
    }),
  );
  void prefetch(
    trpc.game.getGameInsights.queryOptions({
      type: "shared",
      sharedGameId,
    }),
  );
  return (
    <HydrateClient>
      <div className="container flex w-full items-center justify-center px-3 py-4 md:px-6 md:py-8">
        <ErrorBoundary
          fallback={
            <GameNotFound
              title="Shared Game Not Found"
              description="This shared game doesn't exist or is no longer shared with you."
              errorCode="SHARED_GAME_404"
            />
          }
        >
          <Suspense fallback={<GameStatsSkeleton />}>
            <GameStats game={{ type: "shared", sharedGameId }} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
