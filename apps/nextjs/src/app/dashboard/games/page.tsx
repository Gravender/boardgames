import { Suspense } from "react";

import { CardHeader, CardTitle } from "@board-games/ui/card";
import { Table, TableBody } from "@board-games/ui/table";

import { api, HydrateClient } from "~/trpc/server";
import { AddGameDialog } from "./_components/addGameDialog";
import { Games, GameSkeleton } from "./_components/games";

function GamesContentFallback() {
  return (
    <>
      <CardHeader>
        <CardTitle>Games</CardTitle>
      </CardHeader>
      <div className="h-[75vh] sm:h-[80vh]">
        <Table className="hidden pb-14 xs:block">
          <TableBody className="flex w-full flex-col gap-2 pb-14 xs:p-4 xs:pb-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <GameSkeleton key={i} />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export default function Page() {
  void api.game.getGames.prefetch();
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <div className="container relative mx-auto h-[90vh] max-w-3xl px-4">
          <Suspense fallback={<GamesContentFallback />}>
            <Games />
          </Suspense>
          <div className="absolute bottom-4 right-6 z-10 sm:right-10">
            <AddGameDialog />
          </div>
        </div>
      </div>
    </HydrateClient>
  );
}
