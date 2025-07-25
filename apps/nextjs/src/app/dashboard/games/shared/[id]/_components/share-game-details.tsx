"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { EyeIcon, PencilIcon } from "lucide-react";

import { Badge } from "@board-games/ui/badge";

import { GameImage } from "~/components/game-image";
import { AddMatchDialog } from "~/components/match/add";
import { useTRPC } from "~/trpc/react";
import { GameDetails } from "../../../_components/game-details";
import { MatchesList } from "../../../_components/matches-list";

export default function SharedGameDetails({ gameId }: { gameId: number }) {
  const trpc = useTRPC();
  const { data: game } = useSuspenseQuery(
    trpc.sharing.getSharedGame.queryOptions({ id: gameId }),
  );
  if (game === null) return null;
  return (
    <div>
      {/* Game details section */}
      <div className="flex flex-row gap-2 sm:gap-4 md:gap-6">
        {/* Game image - smaller on mobile */}
        <div className="mx-auto hidden xs:block xs:w-1/3 sm:w-1/4 md:mx-0 md:w-1/5 lg:w-1/6">
          <GameImage
            image={game.image}
            alt={`${game.name} game image`}
            containerClassName="aspect-square w-full rounded-lg border shadow"
          />
        </div>

        {/* Game info - more compact on mobile */}
        <div className="flex-1">
          <div className="mb-2 flex items-center justify-between">
            <h1 className="text-2xl font-bold md:text-3xl">{game.name}</h1>
            <Badge
              variant="outline"
              className={`${
                game.permission === "edit" ? "bg-blue-600" : "bg-gray-600"
              } flex items-center gap-1 text-white`}
            >
              {game.permission === "edit" ? (
                <>
                  <PencilIcon className="h-3 w-3" />
                  Edit Access
                </>
              ) : (
                <>
                  <EyeIcon className="h-3 w-3" />
                  View Only
                </>
              )}
            </Badge>
          </div>

          <GameDetails
            players={game.players}
            playtime={game.playtime}
            yearPublished={game.yearPublished}
            matchesCount={game.matches.length}
            isShared={true}
          />
        </div>
      </div>

      {/* Match history section - more compact header on mobile */}
      <div className="relative">
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <h2 className="text-xl font-semibold md:text-2xl">Match History</h2>
        </div>
        <MatchesList matches={game.matches} isShared={true} />
        <div className="absolute bottom-4 right-6 z-10 sm:right-10">
          <AddMatchDialog
            gameId={gameId}
            gameType="shared"
            gameName={game.name}
            matches={game.matches.length}
          />
        </div>
      </div>
    </div>
  );
}
