"use server";

import { api, HydrateClient } from "~/trpc/server";

import { AddGameDialog } from "./_components/addGameDialog";
import { Games } from "./_components/games";

export default async function Page() {
  const games = await api.game.getGames();
  return (
    <HydrateClient>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 w-full">
        <Games games={games} />
        <AddGameDialog />
      </div>
    </HydrateClient>
  );
}
