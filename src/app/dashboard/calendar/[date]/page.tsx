"use server";

import { redirect } from "next/navigation";
import { isValid } from "date-fns";

import { api } from "~/trpc/server";

import { MatchesTable } from "./_components/matchesTable";

export default async function Page({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const date = (await params).date;
  if (isValid(date)) redirect("/dashboard/calendar");
  const matches = await api.match.getMatchesByDate({
    date: new Date(date),
  });
  if (matches.length === 0) redirect("/dashboard/calendar");

  return (
    <div className="flex w-full items-center justify-center">
      <MatchesTable data={matches} date={date} />
    </div>
  );
}
