import { redirect } from "next/navigation";

import { EditMatchForm } from "~/components/match/edit";
import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";

export default async function Page({
  params,
}: {
  params: Promise<{ matchId: string; id: string }>;
}) {
  const slugs = await params;
  const matchId = slugs.matchId;
  const gameId = slugs.id;
  if (isNaN(Number(matchId))) {
    if (isNaN(Number(gameId))) redirect("/dashboard/games");
    else {
      redirect(`/dashboard/games/${gameId}`);
    }
  }
  const match = await caller.match.getMatch({ id: Number(matchId) });
  if (!match) redirect(`/dashboard/games/${gameId}`);
  const players = await caller.player.getPlayersByGame({
    id: match.gameId,
    type: "original",
  });
  prefetch(trpc.location.getLocations.queryOptions());
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <EditMatchForm match={match} players={players} />
      </div>
    </HydrateClient>
  );
}
