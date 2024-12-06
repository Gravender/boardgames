import Image from "next/image";
import { redirect } from "next/navigation";
import { format } from "date-fns/format";
import { Dices } from "lucide-react";

import { AddMatchDialog } from "~/app/_components/addMatch";
import { Match } from "~/app/_components/match";
import { Matches } from "~/app/_components/matches";
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
