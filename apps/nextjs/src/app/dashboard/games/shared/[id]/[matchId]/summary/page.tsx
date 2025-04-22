import { Suspense } from "react";
import { redirect } from "next/navigation";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import MatchSummarySkeleton from "../../../../_components/match-summary-skeleton";
import SharedMatchSummary from "./_components/shared-match-summary";

interface Props {
  params: Promise<{ matchId: string; id: string }>;
}
export default async function Page({ params }: Props) {
  const slugs = await params;
  const matchId = slugs.matchId;
  if (isNaN(Number(matchId))) redirect("/dashboard/games");
  void prefetch(
    trpc.sharing.getSharedMatchSummary.queryOptions({ id: Number(matchId) }),
  );
  return (
    <HydrateClient>
      <div className="container flex w-full items-center justify-center p-2 sm:px-3 sm:py-4 md:px-6 md:py-8">
        <Suspense fallback={<MatchSummarySkeleton />}>
          <SharedMatchSummary matchId={Number(matchId)} />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
