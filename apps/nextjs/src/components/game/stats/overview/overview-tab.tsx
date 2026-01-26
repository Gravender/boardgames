"use client";

import { Suspense } from "react";

import type { GameInput } from "~/components/match/types/input";
import {
  PlayerStatsTableSkeleton,
  PlayerStatsTableWithData,
} from "./player-stats-table";
import {
  RecentMatchesListSkeleton,
  RecentMatchesListWithData,
} from "./recent-matches-list";

export default function OverviewTab({ game }: { game: GameInput }) {
  return (
    <>
      <Suspense fallback={<PlayerStatsTableSkeleton />}>
        <PlayerStatsTableWithData game={game} />
      </Suspense>
      <div className="grid grid-cols-1 gap-6">
        <Suspense fallback={<RecentMatchesListSkeleton />}>
          <RecentMatchesListWithData game={game} />
        </Suspense>
      </div>
    </>
  );
}
