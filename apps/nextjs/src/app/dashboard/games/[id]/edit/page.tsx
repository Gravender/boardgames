import { Suspense } from "react";
import { redirect } from "next/navigation";

import { EditGameFormWithSuspense } from "~/components/game/edit";
import { EditGameFormSkeleton } from "~/components/game/edit/edit-game-form-skeleton";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  const gameId = Number(id);

  if (isNaN(gameId)) redirect("/dashboard/games");

  // Prefetch queries
  void prefetch(
    trpc.newGame.getGame.queryOptions({ id: gameId, type: "original" }),
  );
  void prefetch(
    trpc.newGame.gameScoreSheetsWithRounds.queryOptions({
      id: gameId,
      type: "original",
    }),
  );
  void prefetch(
    trpc.newGame.gameRoles.queryOptions({
      id: gameId,
      type: "original",
    }),
  );

  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <Suspense fallback={<EditGameFormSkeleton />}>
          <EditGameFormWithSuspense
            game={{
              id: gameId,
              type: "original",
            }}
          />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
