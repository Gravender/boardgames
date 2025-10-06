import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ErrorBoundary } from "react-error-boundary";

import { MatchNotFound } from "~/components/match/MatchNotFound";
import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";
import MatchSummarySkeleton from "../../../_components/match-summary-skeleton";
import MatchSummary from "./_components/match-summary";

interface Props {
  params: Promise<{ matchId: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // read route params
  const slugs = await params;
  const matchId = slugs.matchId;

  // fetch data
  if (isNaN(Number(matchId))) return { title: "Games" };
  const match = await caller.newMatch.getMatch({
    id: Number(matchId),
    type: "original",
  });

  return {
    title: `${match.name} Summary`,
    description: `Summarizing the results of ${match.name}`,
  };
}
export default async function Page({ params }: Props) {
  const slugs = await params;
  const matchId = slugs.matchId;
  if (isNaN(Number(matchId))) redirect("/dashboard/games");
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
    trpc.newMatch.getMatchSummary.queryOptions({
      id: Number(matchId),
      type: "original",
    }),
  );
  void prefetch(
    trpc.newGame.gameMatches.queryOptions({
      id: Number(matchId),
      type: "original",
    }),
  );

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<MatchNotFound />}>
        <div className="container flex w-full items-center justify-center p-2 sm:px-3 sm:py-4 md:px-6 md:py-8">
          <Suspense fallback={<MatchSummarySkeleton />}>
            <MatchSummary matchId={Number(matchId)} />
          </Suspense>
        </div>
      </ErrorBoundary>
    </HydrateClient>
  );
}
