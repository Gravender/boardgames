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
  const slugs = await params;
  const matchId = slugs.matchId;
  const gameId = slugs.id;
  if (isNaN(Number(matchId))) {
    if (isNaN(Number(gameId))) redirect("/dashboard/games");
    else {
      redirect(`/dashboard/games/shared/${gameId}`);
    }
  }
  try {
    const match = await caller.match.getMatch({
      sharedMatchId: Number(matchId),
      type: "shared",
    });
    return {
      title: `${match.name} Scoresheet`,
      description: `Scoresheet Table for ${match.name}`,
    };
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      return { title: "Shared Match Not Found" };
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
      redirect(`/dashboard/games/shared/${gameId}`);
    }
  }
  void prefetch(
    trpc.match.getMatch.queryOptions({
      sharedMatchId: Number(matchId),
      type: "shared",
    }),
  );
  void prefetch(
    trpc.match.getMatchScoresheet.queryOptions({
      sharedMatchId: Number(matchId),
      type: "shared",
    }),
  );
  void prefetch(
    trpc.match.getMatchPlayersAndTeams.queryOptions({
      sharedMatchId: Number(matchId),
      type: "shared",
    }),
  );

  return (
    <HydrateClient>
      <ErrorBoundary
        fallback={
          <MatchNotFound
            title="Shared Match Not Found"
            description="This shared match doesn't exist or is no longer shared with you."
            errorCode="SHARED_MATCH_404"
          />
        }
      >
        <Suspense>
          <Scoresheet
            match={{
              sharedMatchId: Number(matchId),
              type: "shared",
            }}
          />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
