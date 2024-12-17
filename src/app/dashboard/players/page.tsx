"use server";

import { api } from "~/trpc/server";

import { PlayersTable } from "./_components/players";

export default async function Page() {
  const players = await api.player.getPlayers();
  return (
    <div className="flex w-full items-center justify-center">
      <PlayersTable
        data={players.map((player) => ({
          ...player,
          matches: Number(player.matches),
        }))}
      />
    </div>
  );
}
