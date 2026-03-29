import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Table, TableBody } from "@board-games/ui/table";

import {
  LocationMatchesSection,
  LocationMatchesSkeleton,
} from "~/components/location/location-matches-section";
import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // read route params
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/locations");
  const location = await caller.location.getLocation({
    type: "shared",
    sharedId: Number(id),
  });
  if (location === null || location.type !== "shared") {
    redirect("/dashboard/locations");
  }
  return {
    title: location.name,
    description: `${location.name} Match Tracker`,
    icons: [{ rel: "icon", url: "/map-pin.ico" }],
  };
}

export default async function Page({ params }: Props) {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/locations");
  const locationInput = { type: "shared" as const, sharedId: Number(id) };
  void prefetch(trpc.location.getLocation.queryOptions(locationInput));
  void prefetch(trpc.location.getLocationMatches.queryOptions(locationInput));
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <Suspense
          fallback={
            <div className="relative container mx-auto h-[90vh] max-w-3xl px-4">
              <Table className="flex flex-col gap-2">
                <TableBody>
                  {[
                    "shared-location-match-1",
                    "shared-location-match-2",
                    "shared-location-match-3",
                    "shared-location-match-4",
                    "shared-location-match-5",
                  ].map((itemKey) => (
                    <LocationMatchesSkeleton key={itemKey} />
                  ))}
                </TableBody>
              </Table>
            </div>
          }
        >
          <LocationMatchesSection input={locationInput} />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
