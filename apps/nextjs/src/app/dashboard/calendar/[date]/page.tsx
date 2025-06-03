"use server";

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isValid } from "date-fns";

import { caller, HydrateClient } from "~/trpc/server";
import { MatchesTable } from "./_components/matchesTable";

export default async function Page({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const date = (await params).date;
  if (!isValid(new Date(date))) redirect("/dashboard/calendar");
  const matchesByDate = await caller.match.getMatchesByDate({
    date: new Date(date),
  });
  if (matchesByDate.matches.length === 0) redirect("/dashboard/calendar");

  return (
    <div className="flex w-full items-center justify-center">
      <HydrateClient>
        <Suspense>
          <MatchesTable
            data={matchesByDate.matches}
            players={matchesByDate.players}
            date={date}
          />
        </Suspense>
      </HydrateClient>
    </div>
  );
}
