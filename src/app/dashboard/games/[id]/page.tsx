import { redirect } from "next/navigation";

import { Matches } from "~/app/_components/matches";
import { api, HydrateClient } from "~/trpc/server";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/games");
  const game = await api.game.getGame({ id: Number(id) });
  if (!game) redirect("/dashboard/games");
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <Matches
          matches={game.matches}
          gameName={game.name}
          imageUrl={game.imageUrl}
          gameId={game.id}
        />
      </div>
    </HydrateClient>
  );
}
