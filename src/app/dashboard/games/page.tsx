"use server";

import { auth } from "@clerk/nextjs/server";
import { AddGameDialog } from "~/app/_components/addGameDialog";
import { Games } from "~/app/_components/games";
import { api, HydrateClient } from "~/trpc/server";

export default async function Page() {
  const { userId } = await auth();
  const games = userId ? await api.game.getGames() : [];
  return (
    <HydrateClient>
      <div>
        {userId ? (
          <Games games={games} />
        ) : (
          <span>You need to be logged in to view this page.</span>
        )}
      </div>

      <AddGameDialog />
    </HydrateClient>
  );
}
