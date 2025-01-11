"use server";

import { api } from "~/trpc/server";
import { PlayedChart } from "./_components/gamesPlayedChart";
import { PlayersCard } from "./_components/playersCard";
import { UniqueGamesChart } from "./_components/uniqueGamesChart";

export default async function Page() {
  const matches = await api.dashboard.getMatchesByMonth();
  const uniqueGames = await api.dashboard.getUniqueGames();
  const players = await api.dashboard.getPlayersWIthMatches();
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        {players.length > 0 && <PlayersCard data={players} />}
        {matches.played > 0 && <PlayedChart data={matches.months} />}
        {uniqueGames.currentMonthGames > 0 && (
          <UniqueGamesChart data={uniqueGames} />
        )}
      </div>
      <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
    </div>
  );
}
