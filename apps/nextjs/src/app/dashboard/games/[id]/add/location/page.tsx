"use server";

import { caller, HydrateClient } from "~/trpc/server";
import { LocationsTable } from "./_components/locationTable";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gameId = (await params).id;
  const locations = await caller.location.getLocations();
  return (
    <HydrateClient>
      <LocationsTable gameId={Number(gameId)} data={locations} />
    </HydrateClient>
  );
}
