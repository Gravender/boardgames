import Image from "next/image";
import { redirect } from "next/navigation";
import { format } from "date-fns/format";
import { Dices } from "lucide-react";

import { Matches } from "~/app/_components/matches";
import { api, HydrateClient } from "~/trpc/server";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  const game = await api.game.getGame({ id: Number(id) });
  if (!game) redirect("dashboard/games");
  return (
    <HydrateClient>
      <h1>{game.name}</h1>
      {game.matches.length > 0 && (
        <span>{`${game.matches.length} ${game.matches.length > 1 ? "games" : "game"} played`}</span>
      )}
      <div>
        <Matches
          matches={game.matches}
          gameName={game.name}
          imageUrl={game.imageUrl}
        />
      </div>
    </HydrateClient>
  );
}
