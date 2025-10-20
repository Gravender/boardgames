import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ErrorBoundary } from "react-error-boundary";

import { EditMatchForm } from "~/components/match/edit";
import { MatchNotFound } from "~/components/match/MatchNotFound";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import Loading from "../../../loading";

export default async function Page({
  params,
}: {
  params: Promise<{ matchId: string; id: string }>;
}) {
  const slugs = await params;
  const matchId = slugs.matchId;
  const gameId = slugs.id;
  if (isNaN(Number(matchId))) {
    if (isNaN(Number(gameId))) redirect("/dashboard/games");
    else {
      redirect(`/dashboard/games/${gameId}`);
    }
  }

  prefetch(
    trpc.newMatch.getMatch.queryOptions({
      id: Number(matchId),
      type: "original",
    }),
  );
  prefetch(
    trpc.newMatch.getMatchPlayersAndTeams.queryOptions({
      id: Number(matchId),
      type: "original",
    }),
  );
  prefetch(
    trpc.player.getPlayersByGame.queryOptions({
      id: Number(gameId),
      type: "original",
    }),
  );
  prefetch(trpc.location.getLocations.queryOptions());
  return (
    <HydrateClient>
      <ErrorBoundary fallback={<MatchNotFound />}>
        <div className="flex w-full items-center justify-center">
          <Suspense fallback={<Loading />}>
            <EditMatchForm
              match={{
                type: "original",
                id: Number(matchId),
              }}
              game={{
                type: "original",
                id: Number(gameId),
              }}
            />
          </Suspense>
        </div>
      </ErrorBoundary>
    </HydrateClient>
  );
}
