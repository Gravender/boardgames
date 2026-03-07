import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Table, TableBody } from "@board-games/ui/table";

import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";
import { Matches, MatchSkeleton } from "./_components/Matches";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // read route params
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/locations");
  const location = await caller.location.getLocation({ id: Number(id) });
  if (location === null) redirect("/dashboard/locations");
  return {
    title: location.name,
    description: `${location.name} Match Tracker`,
    icons: [{ rel: "icon", url: "/map-pin.ico" }],
  };
}

export default async function Page({ params }: Props) {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/locations");
  void prefetch(trpc.location.getLocation.queryOptions({ id: Number(id) }));
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <Suspense
          fallback={
            <div className="relative container mx-auto h-[90vh] max-w-3xl px-4">
              <Table className="flex flex-col gap-2">
                <TableBody>
                  {[
                    "location-match-1",
                    "location-match-2",
                    "location-match-3",
                    "location-match-4",
                    "location-match-5",
                  ].map((itemKey) => (
                    <MatchSkeleton key={itemKey} />
                  ))}
                </TableBody>
              </Table>
            </div>
          }
        >
          <Matches locationId={Number(id)} />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
