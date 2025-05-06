import type { Metadata } from "next";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { LocationsTable } from "./_components/locationsTable";

export const metadata: Metadata = {
  title: "Board Games Locations",
  description: "Locations where you play boardgames",
  icons: [{ rel: "icon", url: "/map-pin.ico" }],
};

// eslint-disable-next-line @typescript-eslint/require-await
export default async function Page() {
  void prefetch(trpc.location.getLocations.queryOptions());
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <LocationsTable />
      </div>
    </HydrateClient>
  );
}
