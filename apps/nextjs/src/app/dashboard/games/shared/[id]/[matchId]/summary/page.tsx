import { redirect } from "next/navigation";
import { ErrorBoundary } from "react-error-boundary";

import { MatchNotFound } from "~/components/match/MatchNotFound";
import MatchSummary from "~/components/match/summary/match-summary";
import { HydrateClient } from "~/trpc/server";

interface Props {
  params: Promise<{ matchId: string; id: string }>;
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
              type: "shared",
              sharedMatchId: Number(matchId),
            }}
            game={{
              type: "shared",
              sharedGameId: Number(gameId),
            }}
          />
        </div>
      </ErrorBoundary>
    </HydrateClient>
  );
}
