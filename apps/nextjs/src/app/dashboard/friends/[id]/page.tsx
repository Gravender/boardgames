import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";
import FriendProfilePage from "./_components/friend-profile-page";
import { FriendProfileSkeleton } from "./_components/friend-profile-skeleton";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // read route params
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/friends");
  const friend = await caller.friend.getFriendMetaData({
    friendId: Number(id),
  });
  if (!friend) redirect("/dashboard/friends");

  return {
    title: friend.name,
    icons: [{ rel: "icon", url: "/user.ico" }],
    openGraph: {
      images: friend.image?.url ? [friend.image.url] : [],
    },
  };
}

export default async function Page({ params }: Props) {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/friends");
  void prefetch(trpc.friend.getFriend.queryOptions({ friendId: Number(id) }));
  return (
    <HydrateClient>
      <div className="max-auto container px-4 py-2">
        <Suspense fallback={<FriendProfileSkeleton />}>
          <FriendProfilePage friendId={Number(id)} />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
