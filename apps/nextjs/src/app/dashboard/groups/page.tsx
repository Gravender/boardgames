import { Suspense } from "react";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { GroupSkeleton, GroupTable } from "./_components/groupTable";

export default function Page() {
  void prefetch(trpc.group.getGroups.queryOptions());
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <Suspense
          fallback={
            <div className="relative container mx-auto h-[90vh] max-w-3xl px-4">
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <GroupSkeleton key={i} />
                ))}
              </div>
            </div>
          }
        >
          <GroupTable />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
