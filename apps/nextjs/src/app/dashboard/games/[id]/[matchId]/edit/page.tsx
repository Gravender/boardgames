import { redirect } from "next/navigation";

import { EditMatch } from "~/components/match/edit/index";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";

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

  prefetch(
    trpc.match.getMatch.queryOptions({
      id: Number(matchId),
      type: "original",
    }),
  );
  prefetch(
    trpc.match.getMatchPlayersAndTeams.queryOptions({
      id: Number(matchId),
      type: "original",
    }),
  );
  prefetch(
    trpc.player.getPlayersByGame.queryOptions({
      id: Number(gameId),
      type: "original",
    }),
  );
  prefetch(trpc.location.getLocations.queryOptions());
  return (
    <HydrateClient>
      <EditMatch
        match={{
          type: "original",
          id: Number(matchId),
        }}
        game={{
          type: "original",
          id: Number(gameId),
        }}
      />
    </HydrateClient>
  );
}
