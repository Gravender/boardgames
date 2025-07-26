import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";
import { GamePageSkeleton } from "../_components/game-page-skeleton";
import GameDetails from "./_components/game-detail";

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
    return { title: game.name, description: `${game.name} Match Tracker` };
  return {
    title: game.name,
    description: `${game.name} Match Tracker`,
    openGraph: {
      images: [game.image.url],
    },
  };
}

export default async function Page({ params }: Props) {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/games");
  void prefetch(trpc.game.getGame.queryOptions({ id: Number(id) }));
  void prefetch(
    trpc.game.getGameScoresheets.queryOptions({
      gameId: Number(id),
      type: "original",
    }),
  );
  void prefetch(trpc.location.getLocations.queryOptions());
  void prefetch(
    trpc.player.getPlayersByGame.queryOptions({
      id: Number(id),
      type: "original",
    }),
  );
  void prefetch(
    trpc.game.getGameRoles.queryOptions({
      id: Number(id),
      type: "original",
    }),
  );
  return (
    <HydrateClient>
      <div className="container px-3 py-1 md:px-6 md:py-2">
        <Suspense fallback={<GamePageSkeleton />}>
          <GameDetails gameId={Number(id)} />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
