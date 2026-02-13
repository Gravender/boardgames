import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ErrorBoundary } from "react-error-boundary";

import { GameNotFound } from "~/components/game/not-found";
import GameStats from "~/components/game/stats/game-stats";
import { GameStatsSkeleton } from "~/components/game/stats/game-stats-skeleton";
import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";

interface Props {
  params: Promise<{ id: string }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/games");
  try {
    const game = await caller.game.getGame({
      type: "original",
      id: Number(id),
    });
    const image = game.image?.url;
    if (!image)
      return {
        title: `${game.name} Stats`,
        description: `${game.name} Stats`,
      };
    return {
      title: `${game.name} Stats`,
      description: `${game.name} Stats`,
      openGraph: {
        images: [image],
      },
    };
  } catch {
    return { title: "Game Stats", description: "Game Stats" };
  }
}
export default async function GameStatsPage({ params }: Props) {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/games");
  void prefetch(
    trpc.game.getGameScoresheetStats.queryOptions({
      type: "original",
      id: Number(id),
    }),
  );
  void prefetch(
    trpc.game.getGameStatsHeader.queryOptions({
      id: Number(id),
      type: "original",
    }),
  );
  void prefetch(
    trpc.game.gameMatches.queryOptions({ id: Number(id), type: "original" }),
  );
  void prefetch(
    trpc.game.getGamePlayerStats.queryOptions({
      id: Number(id),
      type: "original",
    }),
  );
  void prefetch(
    trpc.game.getGameInsights.queryOptions({
      id: Number(id),
      type: "original",
    }),
  );
  return (
    <HydrateClient>
      <div className="container flex w-full items-center justify-center px-3 py-4 md:px-6 md:py-8">
        <ErrorBoundary fallback={<GameNotFound />}>
          <Suspense fallback={<GameStatsSkeleton />}>
            <GameStats game={{ id: Number(id), type: "original" }} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
