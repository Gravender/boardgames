"use server";

import { format } from "date-fns";

import { caller, HydrateClient } from "~/trpc/server";
import { ClientCalendar } from "./_components/client-calendar";

export default async function Page() {
  const dates = await caller.newMatch.date.getMatchesByCalendar();
  const matchDayMap = new Map(
    dates.map((md) => [
      format(md.date, "MM-dd-yy"),
      { matches: md.count, date: md.date },
    ]),
  );
  return (
    <HydrateClient>
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <h1 className="mb-8 text-3xl font-bold">Plays Calendar</h1>
        <div className="h-40 w-full max-w-3xl flex-1">
          <ClientCalendar matchDayMap={matchDayMap} />
        </div>
      </div>
    </HydrateClient>
  );
}
