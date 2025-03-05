"use server";

import { api } from "~/trpc/server";
import { ChartCard } from "./_components/chart-card";
import DaysPlayedChart from "./_components/day-played-chart";
import { PlayedChart } from "./_components/gamesPlayedChart";
import PlacementsChart from "./_components/placements-chart";
import { PlayersCard } from "./_components/playersCard";
import { UniqueGamesChart } from "./_components/uniqueGamesChart";
import WinPercentageChart from "./_components/win-percentage-chart";

export default async function Page() {
  const matches = await api.dashboard.getMatchesByMonth();
  const uniqueGames = await api.dashboard.getUniqueGames();
  const players = await api.dashboard.getPlayersWIthMatches();
  const placements = await api.dashboard.getUserPlacements();
  const winPercentage = await api.dashboard.getUserWinPercentage();
  const daysOfWeek = await api.dashboard.getDaysPlayed();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 pt-0">
      <div className="grid max-w-4xl gap-4 md:grid-cols-2 lg:grid-cols-3">
        {uniqueGames.currentMonthGames > 0 && (
          <UniqueGamesChart data={uniqueGames} />
        )}
        <ChartCard
          className="col-span-1 lg:col-span-1"
          title="Match Placements"
          description="Distribution of your placements in matches"
          children={<PlacementsChart data={placements} />}
        />
        <ChartCard
          className="col-span-1"
          title="Days of the Week Played"
          description="When you play the most during the week"
          children={<DaysPlayedChart data={daysOfWeek} />}
        />
        {players.length > 0 && <PlayersCard data={players} />}
        {matches.played > 0 && <PlayedChart data={matches.months} />}
        <WinPercentageChart data={winPercentage} />
      </div>
      <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
    </div>
  );
}
