import { Suspense } from "react";
import { redirect } from "next/navigation";

import { HydrateClient } from "~/trpc/server";
import { FriendProfileSkeleton } from "../_components/friend-profile-skeleton";
import { FriendSharedItemsPage } from "./_components/friend-shared-items-page";

interface Props {
  params: Promise<{ id: string }>;
}
export default async function FriendSharedPage({ params }: Props) {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/friends");
  return (
    <HydrateClient>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Shared Items</h1>
        </div>

        <Suspense fallback={<FriendProfileSkeleton />}>
          <FriendSharedItemsPage friendId={Number(id)} />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
