import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@board-games/ui/skeleton";

import { GroupsList } from "~/components/group/groups-list";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";

const GroupsListFallback = () => (
  <div className="relative mx-auto min-h-[85vh] w-full max-w-3xl px-4 pb-28 pt-8">
    <header className="mb-8 space-y-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 max-w-lg" />
        </div>
      </div>
      <Skeleton className="h-11 max-w-md rounded-lg" />
    </header>
    <div className="flex flex-col gap-3 pr-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
      ))}
    </div>
  </div>
);

export const metadata: Metadata = {
  title: "Groups",
  description: "Player groups for matches",
};

export default async function Page() {
  void prefetch(trpc.group.getGroupsWithPlayers.queryOptions());
  void prefetch(trpc.player.getPlayers.queryOptions());
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <Suspense fallback={<GroupsListFallback />}>
          <GroupsList />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
