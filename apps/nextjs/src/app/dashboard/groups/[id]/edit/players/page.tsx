"use server";

import { redirect } from "next/navigation";

import { api, HydrateClient } from "~/trpc/server";
import { PlayersTable } from "./_components/playerTable";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  if (isNaN(Number(id))) redirect("/dashboard/groups");
  const players = await api.player.getPlayersByGroup({
    group: { id: Number(id) },
  });

  return (
    <HydrateClient>
      <PlayersTable
        data={players.map((player) => ({
          ...player,
          matches: Number(player.matches),
        }))}
        groupId={Number(id)}
      />
      ;
    </HydrateClient>
  );
}
