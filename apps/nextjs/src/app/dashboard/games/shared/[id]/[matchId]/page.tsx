import { Suspense } from "react";
import { redirect } from "next/navigation";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { ScoreSheetTable } from "./_components/scoresheet-table";

interface Props {
  params: Promise<{ matchId: string; id: string }>;
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
    trpc.sharing.getSharedMatch.queryOptions({ id: Number(matchId) }),
  );
  return (
    <HydrateClient>
      <Suspense>
        <ScoreSheetTable matchId={Number(matchId)} />
      </Suspense>
    </HydrateClient>
  );
}
