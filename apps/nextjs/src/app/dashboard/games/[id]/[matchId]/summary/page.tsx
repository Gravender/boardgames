import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ErrorBoundary } from "react-error-boundary";

import { MatchNotFound } from "~/components/match/MatchNotFound";
import MatchSummary from "~/components/match/summary/match-summary";
import { caller, HydrateClient } from "~/trpc/server";

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
  const gameId = slugs.id;
  if (isNaN(Number(matchId)) || isNaN(Number(gameId))) {
    if (isNaN(Number(gameId))) redirect("/dashboard/games");
    else {
      redirect(`/dashboard/games/${gameId}`);
    }
  }

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<MatchNotFound />}>
        <div className="container flex w-full items-center justify-center p-2 sm:px-3 sm:py-4 md:px-6 md:py-8">
          <MatchSummary
            match={{
              id: Number(matchId),
              type: "original",
            }}
            game={{
              id: Number(gameId),
              type: "original",
            }}
          />
        </div>
      </ErrorBoundary>
    </HydrateClient>
  );
}
