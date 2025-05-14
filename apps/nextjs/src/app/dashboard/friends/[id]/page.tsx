import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";
import FriendProfilePage from "./_components/friend-profile-page";

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
      images: [friend.imageUrl],
    },
  };
}

export default async function Page({ params }: Props) {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/friends");
  void prefetch(trpc.friend.getFriend.queryOptions({ friendId: Number(id) }));
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <Suspense
          fallback={
            <div className="container max-w-4xl py-10">
              <div className="mb-2 h-8 w-32 animate-pulse rounded bg-gray-200"></div>
              <div className="mb-8 h-6 w-48 animate-pulse rounded bg-gray-200"></div>

              <div className="mb-6 h-10 w-full animate-pulse rounded bg-gray-200"></div>

              <div className="space-y-4">
                <div className="h-40 w-full animate-pulse rounded bg-gray-200"></div>
                <div className="h-40 w-full animate-pulse rounded bg-gray-200"></div>
              </div>
            </div>
          }
        >
          <FriendProfilePage friendId={Number(id)} />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
