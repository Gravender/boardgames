import { Suspense } from "react";
import { redirect } from "next/navigation";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { GamePageSkeleton } from "../../_components/game-page-skeleton";
import SharedGameDetails from "./_components/share-game-details";

interface Props {
  params: Promise<{ id: string }>;
}
export default async function SharedGamePage({ params }: Props) {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/games");
  void prefetch(trpc.sharing.getSharedGame.queryOptions({ id: Number(id) }));
  void prefetch(
    trpc.game.getGameScoresheets.queryOptions({
      gameId: Number(id),
      type: "shared",
    }),
  );
  void prefetch(trpc.location.getLocations.queryOptions());
  void prefetch(
    trpc.player.getPlayersByGame.queryOptions({
      id: Number(id),
      type: "shared",
    }),
  );
  return (
    <HydrateClient>
      <div className="container px-3 py-1 md:px-6 md:py-2">
        <Suspense fallback={<GamePageSkeleton />}>
          <SharedGameDetails gameId={Number(id)} />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
