import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import GameStats from "~/components/game/stats/game-stats";
import { GameStatsSkeleton } from "~/components/game/stats/game-stats-skeleton";
import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";

interface Props {
  params: Promise<{ id: string }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // read route params
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/games");
  const game = await caller.game.getGameMetaData({ id: Number(id) });
  if (!game) redirect("/dashboard/games");
  if (!game.image?.url)
    return { title: `${game.name} Stats`, description: `${game.name} Stats` };
  return {
    title: `${game.name} Stats`,
    description: `${game.name} Stats`,
    openGraph: {
      images: [game.image.url],
    },
  };
}
export default async function GameStatsPage({ params }: Props) {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/games");
  void prefetch(trpc.game.getGameStats.queryOptions({ id: Number(id) }));
  void prefetch(
    trpc.newGame.getGameScoresheetStats.queryOptions({
      type: "original",
      id: Number(id),
    }),
  );
  void prefetch(
    trpc.newGame.getGameStatsHeader.queryOptions({
      id: Number(id),
      type: "original",
    }),
  );
  void prefetch(
    trpc.newGame.gameMatches.queryOptions({ id: Number(id), type: "original" }),
  );
  void prefetch(
    trpc.newGame.getGamePlayerStats.queryOptions({
      id: Number(id),
      type: "original",
    }),
  );
  return (
    <HydrateClient>
      <div className="container flex w-full items-center justify-center px-3 py-4 md:px-6 md:py-8">
        <Suspense fallback={<GameStatsSkeleton />}>
          <GameStats game={{ id: Number(id), type: "original" }} />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
