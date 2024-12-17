"use server";

import { redirect } from "next/navigation";

import { api, HydrateClient } from "~/trpc/server";

import { PlayersTable } from "./_components/playerTable";
import SelectPlayersForm from "./_components/selectPlayersForm";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/games");
  const players = await api.player.getPlayersByGame({
    game: { id: Number(id) },
  });
  return (
    <HydrateClient>
      <PlayersTable
        gameId={Number(id)}
        data={players.map((player) => ({
          id: player.id,
          name: player.name,
          imageUrl: player.imageUrl,
          matches: Number(player.matches),
        }))}
      />
      ;
    </HydrateClient>
  );
}
