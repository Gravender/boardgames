import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ErrorBoundary } from "react-error-boundary";

import { EditGameFormWithSuspense } from "~/components/game/edit";
import { EditGameFormSkeleton } from "~/components/game/edit/edit-game-form-skeleton";
import { GameNotFound } from "~/components/game/not-found";
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
    trpc.game.getGame.queryOptions({ id: gameId, type: "original" }),
  );
  void prefetch(
    trpc.game.gameScoreSheetsWithRounds.queryOptions({
      id: gameId,
      type: "original",
    }),
  );
  void prefetch(
    trpc.game.gameRoles.queryOptions({
      id: gameId,
      type: "original",
    }),
  );

  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <ErrorBoundary fallback={<GameNotFound />}>
          <Suspense fallback={<EditGameFormSkeleton />}>
            <EditGameFormWithSuspense
              game={{
                id: gameId,
                type: "original",
              }}
            />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
