"use server";

import type { Metadata } from "next";

import { api } from "~/trpc/server";
import { PlayersTable } from "./_components/players";

// eslint-disable-next-line @typescript-eslint/require-await
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Players",
    icons: [{ rel: "icon", url: "/users.ico" }],
  };
}

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
