import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { Match } from "~/app/_components/match";
import { api, HydrateClient } from "~/trpc/server";

export default async function Page({
  params,
}: {
  params: Promise<{ matchId: string; id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/dashboard");
  const slugs = await params;
  const matchId = slugs.matchId;
  const gameId = slugs.id;
  if (isNaN(Number(matchId))) {
    if (isNaN(Number(gameId))) redirect("/dashboard/games");
    else {
      redirect(`/dashboard/games/${gameId}`);
    }
  }
  const match = await api.match.getMatch({ id: Number(matchId) });
  if (!match) redirect(`/dashboard/games/${gameId}`);
  return (
    <HydrateClient>
      <Match match={match} />
    </HydrateClient>
  );
}
