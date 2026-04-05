import type { Metadata } from "next";
import { Suspense } from "react";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { GroupsList } from "~/components/group/groups-list";

export const metadata: Metadata = {
  title: "Groups",
  description: "Player groups for matches",
};

export default async function Page() {
  void prefetch(trpc.group.getGroupsWithPlayers.queryOptions());
  void prefetch(trpc.newPlayer.getPlayers.queryOptions());
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <Suspense>
          <GroupsList />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
