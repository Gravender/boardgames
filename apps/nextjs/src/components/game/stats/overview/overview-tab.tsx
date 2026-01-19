"use client";


import type { RouterOutputs } from "@board-games/api";


import { PlayerStatsTable } from "./player-stats-table";
import { RecentMatchesList } from "./recent-matches-list";

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type Matches = GameStats["matches"];
type Players = GameStats["players"];

export default function OverviewTab({
  matches,
  players,
}: {
  matches: Matches;
  players: Players;
}) {

  return (
    <>
      
      <PlayerStatsTable players={players} />
      <div className="grid grid-cols-1 gap-6">
        <RecentMatchesList matches={matches} />
      </div>
    </>
  );
}
