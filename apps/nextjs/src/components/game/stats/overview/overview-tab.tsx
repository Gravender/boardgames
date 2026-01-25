"use client";

import { Suspense } from "react";

import type { RouterOutputs } from "@board-games/api";

import { PlayerStatsTable } from "./player-stats-table";
import {
  RecentMatchesListSkeleton,
  RecentMatchesListWithData,
} from "./recent-matches-list";

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type Players = GameStats["players"];

export default function OverviewTab({
  game,
  players,
}: {
  game: { type: "original"; id: number };
  players: Players;
}) {
  return (
    <>
      <PlayerStatsTable players={players} />
      <div className="grid grid-cols-1 gap-6">
        <Suspense fallback={<RecentMatchesListSkeleton />}>
          <RecentMatchesListWithData game={game} />
        </Suspense>
      </div>
    </>
  );
}
