"use server";

import { api, HydrateClient } from "~/trpc/server";

import { AddGameDialog } from "./_components/addGameDialog";
import { Games } from "./_components/games";

export default async function Page() {
  const games = await api.game.getGames();
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <div className="flex flex-col gap-1 p-4 pt-0 w-full max-w-5xl">
          <Games games={games} />
          <AddGameDialog />
        </div>
      </div>
    </HydrateClient>
  );
}
