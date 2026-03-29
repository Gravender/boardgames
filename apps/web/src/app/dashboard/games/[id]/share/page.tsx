import { Suspense } from "react";
import { redirect } from "next/navigation";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import ShareGamePage from "./_components/share-game";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const slugs = await params;
  const gameId = slugs.id;
  if (isNaN(Number(gameId))) redirect("/dashboard/games");
  prefetch(trpc.game.getGameToShare.queryOptions({ id: Number(gameId) }));
  prefetch(trpc.friend.getFriends.queryOptions());
  return (
    <HydrateClient>
      <div className="container max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Share Game</h1>
            <p className="text-muted-foreground">
              Share your games with friends and other users
            </p>
          </div>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <ShareGamePage gameId={Number(gameId)} />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
