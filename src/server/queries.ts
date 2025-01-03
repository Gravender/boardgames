"use server";

import { redirect } from "next/navigation";

import { api } from "~/trpc/server";

export async function deleteMatch({
  matchId,
  gameId,
}: {
  matchId: number;
  gameId: number;
}) {
  await api.match.deleteMatch({ id: matchId });
  redirect(`/dashboard/games/${gameId}`);
}

export async function deleteGame({ id }: { id: number }) {
  await api.game.deleteGame({ id });
  redirect("/dashboard/games");
}
export async function deleteGroup({ id }: { id: number }) {
  await api.group.deleteGroup({ id });
  redirect("/dashboard/groups");
}

export async function deleteLocation({ id }: { id: number }) {
  await api.location.deleteLocation({ id });
  redirect("/dashboard/locations");
}
export async function deletePlayer({ id }: { id: number }) {
  await api.player.deletePlayer({ id });
  redirect("/dashboard/players");
}
