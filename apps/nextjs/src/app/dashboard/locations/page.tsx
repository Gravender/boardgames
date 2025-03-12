import type { Metadata } from "next";

import { caller, HydrateClient } from "~/trpc/server";
import { LocationsTable } from "./_components/locationsTable";

export const metadata: Metadata = {
  title: "Board Games Locations",
  description: "Locations where you play boardgames",
  icons: [{ rel: "icon", url: "/map-pin.ico" }],
};

export default async function Page() {
  const locations = await caller.location.getLocations();
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <LocationsTable data={locations} />
      </div>
    </HydrateClient>
  );
}
