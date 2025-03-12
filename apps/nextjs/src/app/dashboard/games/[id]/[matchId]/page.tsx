import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Match } from "~/app/dashboard/games/[id]/[matchId]/_components/match";
import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";

interface Props {
  params: Promise<{ matchId: string; id: string }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // read route params
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
  void prefetch(trpc.match.getMatch.queryOptions({ id: Number(matchId) }));
  return (
    <HydrateClient>
      <Suspense>
        <Match matchId={Number(matchId)} />
      </Suspense>
    </HydrateClient>
  );
}
