import { Suspense } from "react";
import { redirect } from "next/navigation";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import SharePlayerPage from "./_components/share-player";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const slugs = await params;
  const playerId = slugs.id;
  if (isNaN(Number(playerId))) redirect("/dashboard/games");
  prefetch(trpc.player.getPlayerToShare.queryOptions({ id: Number(playerId) }));
  prefetch(trpc.friend.getFriends.queryOptions());
  return (
    <HydrateClient>
      <div className="container max-w-4xl py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Share Player</h1>
            <p className="text-muted-foreground">
              Share your player with friends and other users
            </p>
          </div>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <SharePlayerPage playerId={Number(playerId)} />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
