import { redirect } from "next/navigation";

import { caller, HydrateClient } from "~/trpc/server";
import { EditMatchForm } from "./_components/editMatch";

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
  const match = await caller.match.getMatch({ id: Number(matchId) });
  if (!match) redirect(`/dashboard/games/${gameId}`);
  const players = await caller.player.getPlayersByGame({
    game: { id: match.gameId },
  });
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <EditMatchForm match={match} players={players} />
      </div>
    </HydrateClient>
  );
}
