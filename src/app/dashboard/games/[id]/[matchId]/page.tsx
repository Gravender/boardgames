import { redirect } from "next/navigation";

import { Match } from "~/app/_components/match";
import { api, HydrateClient } from "~/trpc/server";

export default async function Page({
  params,
}: {
  params: Promise<{ matchId: string; id: string }>;
}) {
  const slugs = await params;
  const matchId = slugs.matchId;
  const gameId = slugs.id;
  const match = await api.match.getMatch({ id: Number(matchId) });
  if (!match) redirect(`/dashboard/games/${gameId}`);
  return (
    <HydrateClient>
      <Match match={match} />
    </HydrateClient>
  );
}
