import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader } from "@board-games/ui/card";
import { Skeleton } from "@board-games/ui/skeleton";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import ShareRequestPage from "./_componenets/accept-request";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props) {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/friends");
  void prefetch(
    trpc.sharing.getShareRequest.queryOptions({ requestId: Number(id) }),
  );
  void prefetch(trpc.sharing.getUserGamesForLinking.queryOptions());
  void prefetch(trpc.sharing.getUserPlayersForLinking.queryOptions());
  return (
    <HydrateClient>
      <div className="container max-w-4xl py-10">
        <Suspense
          fallback={
            <>
              <div className="mb-8">
                <Skeleton className="mb-2 h-8 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>

              <Card>
                <CardHeader>
                  <Skeleton className="mb-2 h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-40 w-full" />
                </CardContent>
              </Card>
            </>
          }
        >
          <ShareRequestPage requestId={Number(id)} />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
