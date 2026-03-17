"use server";

import { redirect } from "next/navigation";
import { PlayersTable } from "~/app/dashboard/players/_components/players";

import { HydrateClient } from "~/trpc/server";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  if (isNaN(Number(id))) redirect("/dashboard/groups");

  return (
    <HydrateClient>
      <PlayersTable />;
    </HydrateClient>
  );
}
