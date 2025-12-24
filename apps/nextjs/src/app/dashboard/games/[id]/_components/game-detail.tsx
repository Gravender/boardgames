"use client";

import Link from "next/link";
import { BarChart2 } from "lucide-react";

import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";

import { GameImage } from "~/components/game-image";
import { useGame } from "~/components/game/hooks/game";
import { useGameMatches } from "~/components/game/hooks/matches";
import { AddMatchDialog } from "~/components/match/add/index";
import { GameDetails as GameDetailsComponent } from "../../_components/game-details";
import { MatchesList } from "../../_components/matches-list";

export default function GameDetails({ gameId }: { gameId: number }) {
  const { game } = useGame({ id: gameId, type: "original" });
  const matches = useGameMatches({ id: gameId, type: "original" });

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Game details section */}
      <div className="flex flex-row gap-2 sm:gap-4 md:gap-6">
        {/* Game image - smaller on mobile */}
        <div className="xs:block xs:w-1/3 mx-auto hidden sm:w-1/4 md:mx-0 md:w-1/5 lg:w-1/6">
          <GameImage
            image={game.image}
            alt={`${game.name} game image`}
            containerClassName="aspect-square w-full shadow border rounded-lg"
          />
        </div>

        {/* Game info - more compact on mobile */}
        <div className="flex-1">
          <div className="mb-2 flex items-center justify-between">
            <h1 className="text-2xl font-bold md:text-3xl">{game.name}</h1>
            {game.ownedBy && (
              <Badge variant="outline" className="bg-green-600 text-white">
                Owned
              </Badge>
            )}
          </div>
          <div className="pb-2">
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/dashboard/games/${game.id}/stats`}
                className="flex items-center"
              >
                <BarChart2 className="mr-2 h-4 w-4" />
                View Statistics
              </Link>
            </Button>
          </div>

          <GameDetailsComponent
            players={game.players}
            playtime={game.playtime}
            yearPublished={game.yearPublished}
            matchesCount={matches.gameMatches.length}
          />
        </div>
      </div>

      {/* Match history section - more compact header on mobile */}
      <div className="relative">
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <h2 className="text-xl font-semibold md:text-2xl">Match History</h2>
        </div>
        <MatchesList matches={matches.gameMatches} />
        <div className="absolute right-6 bottom-4 z-10 sm:right-10">
          <AddMatchDialog
            game={{
              type: "original",
              id: gameId,
            }}
            gameName={game.name}
            matches={matches.gameMatches.length}
          />
        </div>
      </div>
    </div>
  );
}
