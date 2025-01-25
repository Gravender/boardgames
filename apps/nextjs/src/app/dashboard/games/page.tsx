"use server";

import { api, HydrateClient } from "~/trpc/server";
import { Games } from "./_components/games";

export default async function Page() {
  const games = await api.game.getGames();
  return (
    <div className="flex w-full items-center justify-center">
      <HydrateClient>
        <Games data={games} />
      </HydrateClient>
    </div>
  );
}
