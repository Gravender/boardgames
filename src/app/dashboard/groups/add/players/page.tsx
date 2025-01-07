"use server";

import { api, HydrateClient } from "~/trpc/server";

import { PlayersTable } from "./_components/playerTable";

export default async function Page() {
  const players = await api.player.getPlayers();

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
