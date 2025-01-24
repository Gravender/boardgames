import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Match } from "~/app/_components/match";
import { api, HydrateClient } from "~/trpc/server";

interface Props {
  params: Promise<{ matchId: string; id: string }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // read route params
  const slugs = await params;
  const matchId = slugs.matchId;

  // fetch data
  if (isNaN(Number(matchId))) return { title: "Games" };
  const match = await api.match.getMatch({ id: Number(matchId) });
  if (!match) return { title: "Match" };
  return {
    title: `${match.name} Scoresheet`,
    description: `Scoresheet Table for ${match.name}`,
  };
}
export default async function Page({ params }: Props) {
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
