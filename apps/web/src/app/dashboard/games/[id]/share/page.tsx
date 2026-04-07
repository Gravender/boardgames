import { redirect } from "next/navigation";

import { ShareGamePage } from "~/components/game/share";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const slugs = await params;
  const gameId = slugs.id;
  if (isNaN(Number(gameId))) redirect("/dashboard/games");
  const id = Number(gameId);
  void prefetch(trpc.game.getGameToShare.queryOptions({ id }));
  void prefetch(trpc.friend.getFriends.queryOptions());
  return (
    <HydrateClient>
      <div className="container max-w-6xl py-6">
        <ShareGamePage gameId={id} />
      </div>
    </HydrateClient>
  );
}
