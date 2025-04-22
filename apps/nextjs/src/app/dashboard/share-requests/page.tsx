import { Suspense } from "react";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import ShareRequestsPage from "./_components/share-requests";

// eslint-disable-next-line @typescript-eslint/require-await
export default async function Page() {
  prefetch(trpc.sharing.getIncomingShareRequests.queryOptions());
  prefetch(trpc.sharing.getOutgoingShareRequests.queryOptions());
  return (
    <HydrateClient>
      <div className="container max-w-4xl">
        <div className="mb-2">
          <h1 className="text-3xl font-bold">Share Requests</h1>
          <p className="text-muted-foreground">
            Manage incoming and outgoing share requests
          </p>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <ShareRequestsPage />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
