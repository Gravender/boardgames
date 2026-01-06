import { Suspense } from "react";

import { prefetch, trpc } from "~/trpc/server";
import { GameHeaderSkeleton } from "../skeleton/header-skeleton";
import { GameMatchesSkeleton } from "../skeleton/matches-skeleton";
import { GameHeaderSection } from "./game-header-section";
import { GameMatchesSection } from "./game-matches-section";

interface GameDetailProps {
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

export default function GameDetail({ game }: GameDetailProps) {
  // Prefetch game data
  void prefetch(trpc.newGame.getGame.queryOptions(game));
  void prefetch(trpc.newGame.gameMatches.queryOptions(game));

  // Prefetch game roles, scoresheets, locations, players, and groups for add match dialog
  void prefetch(trpc.newGame.gameRoles.queryOptions(game));
  void prefetch(trpc.newGame.gameScoresheets.queryOptions(game));
  void prefetch(trpc.location.getLocations.queryOptions());
  void prefetch(trpc.newPlayer.getPlayersForMatch.queryOptions());
  void prefetch(trpc.newGroup.getGroupsWithPlayers.queryOptions());
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Game details section */}
      <Suspense fallback={<GameHeaderSkeleton />}>
        <GameHeaderSection game={game} />
      </Suspense>

      {/* Match history section */}
      <Suspense fallback={<GameMatchesSkeleton />}>
        <GameMatchesSection game={game} />
      </Suspense>
    </div>
  );
}
