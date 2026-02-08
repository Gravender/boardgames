import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";
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
  try {
    const match = await caller.match.getMatch({
      id: Number(matchId),
      type: "original",
    });
    return {
      title: `${match.name} Scoresheet`,
      description: `Scoresheet Table for ${match.name}`,
    };
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      return { title: "Match Not Found" };
    }
    return { title: "Games" };
  }
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
    trpc.match.getMatch.queryOptions({
      id: Number(matchId),
      type: "original",
    }),
  );
  void prefetch(
    trpc.match.getMatchScoresheet.queryOptions({
      id: Number(matchId),
      type: "original",
    }),
  );
  void prefetch(
    trpc.match.getMatchPlayersAndTeams.queryOptions({
      id: Number(matchId),
      type: "original",
    }),
  );

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<MatchNotFound />}>
        <Suspense>
          <Scoresheet
            match={{
              id: Number(matchId),
              type: "original",
            }}
          />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
