import { Suspense } from "react";

import { HydrateClient } from "~/trpc/server";
import { FriendProfileSkeleton } from "../_components/friend-profile-skeleton";
import { FriendStatsPage } from "./_components/friend-stat-page";

interface Props {
  params: Promise<{ id: string }>;
}
export default async function FriendStats({ params }: Props) {
  const id = (await params).id;

  return (
    <HydrateClient>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Friend Stats</h1>
        </div>

        <Suspense fallback={<FriendProfileSkeleton />}>
          <FriendStatsPage friendId={id} />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
