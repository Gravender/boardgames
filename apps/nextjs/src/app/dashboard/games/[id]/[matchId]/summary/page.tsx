import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

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
  const summary = await caller.match.getSummary({
    id: Number(matchId),
  });
  if (!summary) return { title: "Games" };
  if (!summary.image)
    return {
      title: `${summary.name} Summary`,
      description: `Summarizing the results of ${summary.name}`,
    };
  return {
    title: `${summary.name} Summary`,
    description: `Summarizing the results of ${summary.name}`,
    openGraph: {
      images: [summary.image.url ?? ""],
    },
  };
}
export default async function Page({ params }: Props) {
  const slugs = await params;
  const matchId = slugs.matchId;
  if (isNaN(Number(matchId))) redirect("/dashboard/games");
  void prefetch(trpc.match.getSummary.queryOptions({ id: Number(matchId) }));
  return (
    <HydrateClient>
      <div className="container flex w-full items-center justify-center p-2 sm:px-3 sm:py-4 md:px-6 md:py-8">
        <Suspense fallback={<MatchSummarySkeleton />}>
          <MatchSummary matchId={Number(matchId)} />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
