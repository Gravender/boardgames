"use server";

import { caller, HydrateClient } from "~/trpc/server";
import { PlayersTable } from "./_components/playerTable";

export default async function Page() {
  const players = await caller.player.getPlayers();

  return (
    <HydrateClient>
      <PlayersTable
        data={players.map((player) => ({
          ...player,
          matches: Number(player.matches),
        }))}
      />
      ;
    </HydrateClient>
  );
}
