import { Suspense } from "react";
import { redirect } from "next/navigation";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import SharedGameStats from "./_components/shared-game-stats";
import { StatsPageSkeleton } from "./_components/shared-game-stats-skeleton";

interface Props {
  params: Promise<{ id: string }>;
}
export default async function SharedGamePage({ params }: Props) {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/games");
  void prefetch(trpc.sharing.getSharedGame.queryOptions({ id: Number(id) }));
  return (
    <HydrateClient>
      <div className="container flex w-full items-center justify-center px-3 py-4 md:px-6 md:py-8">
        <Suspense fallback={<StatsPageSkeleton />}>
          <SharedGameStats gameId={Number(id)} />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
