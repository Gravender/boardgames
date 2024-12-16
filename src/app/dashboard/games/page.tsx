"use server";

import { AddGameDialog } from "~/app/_components/addGameDialog";
import { Games } from "~/app/_components/games";
import { api, HydrateClient } from "~/trpc/server";

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
