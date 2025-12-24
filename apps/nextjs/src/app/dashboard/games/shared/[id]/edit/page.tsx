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
  const sharedGameId = Number(id);

  if (isNaN(sharedGameId)) redirect("/dashboard/games");

  // Prefetch queries
  void prefetch(
    trpc.game.getGame.queryOptions({
      sharedGameId: sharedGameId,
      type: "shared",
    }),
  );
  void prefetch(
    trpc.newGame.gameScoreSheetsWithRounds.queryOptions({
      sharedGameId: sharedGameId,
      type: "shared",
    }),
  );
  void prefetch(
    trpc.newGame.gameRoles.queryOptions({
      sharedGameId: sharedGameId,
      type: "shared",
    }),
  );

  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <Suspense fallback={<EditGameFormSkeleton />}>
          <EditGameFormWithSuspense
            game={{
              sharedGameId,
              type: "shared",
            }}
          />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
