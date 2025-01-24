"use server";

import { redirect } from "next/navigation";
import { format } from "date-fns";

import { Calendar } from "@board-games/ui/calendar";

import { api, HydrateClient } from "~/trpc/server";
import { ClientCalendar } from "./_components/client-calendar";

export default async function Page() {
  const dates = await api.match.getMatchesByCalender();
  if (!dates) redirect("/dashboard/");
  const matchDayMap = new Map(
    dates.map((md) => [format(md.date, "MM-dd-yy"), md.ids]),
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
