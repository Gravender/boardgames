// import { Suspense } from "react";
import { redirect } from "next/navigation";

// import { HydrateClient, prefetch, trpc } from "~/trpc/server";
// import ShareMatchPage from "./_components/share-match";

export default async function Page({
  params,
}: {
  params: Promise<{ matchId: string; id: string }>;
}) {
  const slugs = await params;
  const matchId = slugs.matchId;
  if (isNaN(Number(matchId))) redirect("/dashboard/games");
  return null;
  // TODO: Implement sharing match
  // prefetch(trpc.friend.getFriends.queryOptions());
  // return (
  //   <HydrateClient>
  //     <div className="container max-w-4xl py-10">
  //       <div className="mb-8 flex items-center justify-between">
  //         <div>
  //           <h1 className="text-3xl font-bold">Share Match</h1>
  //           <p className="text-muted-foreground">
  //             Share your match with friends and other users
  //           </p>
  //         </div>
  //       </div>
  //       <Suspense fallback={<div>Loading...</div>}>
  //         <ShareMatchPage matchId={Number(matchId)} />
  //       </Suspense>
  //     </div>
  //   </HydrateClient>
  // );
}
