"use client";

import { useGame } from "~/components/game/hooks/game";
import { useGameMatches } from "~/components/game/hooks/matches";
import { AddMatchDialog } from "~/components/match/add/index";
import { MatchesList } from "../matches";

interface GameMatchesSectionProps {
  game:
    | {
        id: number;
        type: "original";
      }
    | {
        sharedGameId: number;
        type: "shared";
      };
}

export function GameMatchesSection({
  game: gameInput,
}: GameMatchesSectionProps) {
  const { game } = useGame(gameInput);
  const { gameMatches } = useGameMatches(gameInput);

  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-between md:mb-4">
        <h2 className="text-xl font-semibold md:text-2xl">Match History</h2>
        <AddMatchDialog
          game={gameInput}
          gameName={game.name}
          matches={gameMatches.length}
        />
      </div>
      <MatchesList matches={gameMatches} />
    </div>
  );
}
