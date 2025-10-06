import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ErrorBoundary } from "react-error-boundary";

import { MatchNotFound } from "~/components/match/MatchNotFound";
import { Scoresheet } from "~/components/match/scoresheet";
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
  const match = await caller.newMatch.getMatch({ id: Number(matchId) });
  if (!match)
    return {
      title: `404 - Match Not Found`,
      description: `Match for ${matchId} not found`,
    };
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
  void prefetch(
    trpc.newMatch.getMatch.queryOptions({
      id: Number(matchId),
      type: "original",
    }),
  );
  void prefetch(
    trpc.newMatch.getMatchScoresheet.queryOptions({
      id: Number(matchId),
      type: "original",
    }),
  );
  void prefetch(
    trpc.newMatch.getMatchPlayersAndTeams.queryOptions({
      id: Number(matchId),
      type: "original",
    }),
  );

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<MatchNotFound />}>
        <Suspense>
          <Scoresheet matchId={Number(matchId)} type="original" />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
