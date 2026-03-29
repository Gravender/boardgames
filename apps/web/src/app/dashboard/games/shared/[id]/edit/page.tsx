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
    trpc.game.gameScoreSheetsWithRounds.queryOptions({
      sharedGameId: sharedGameId,
      type: "shared",
    }),
  );
  void prefetch(
    trpc.game.gameRoles.queryOptions({
      sharedGameId: sharedGameId,
      type: "shared",
    }),
  );

  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <ErrorBoundary
          fallback={
            <GameNotFound
              title="Shared Game Not Found"
              description="This shared game doesn't exist or is no longer shared with you."
              errorCode="SHARED_GAME_404"
            />
          }
        >
          <Suspense fallback={<EditGameFormSkeleton />}>
            <EditGameFormWithSuspense
              game={{
                sharedGameId,
                type: "shared",
              }}
            />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
