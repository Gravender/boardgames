"use server";

import { redirect } from "next/navigation";
import { format } from "date-fns";

import { Calendar } from "~/components/ui/calendar";
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <h1 className="text-3xl font-bold mb-8">Plays Calendar</h1>
        <div className="flex-1 w-full max-w-3xl h-40">
          <ClientCalendar matchDayMap={matchDayMap} />
        </div>
      </div>
    </HydrateClient>
  );
}
