"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";
import GameRequestPage from "./game-request";

export default function ShareRequestPage({ requestId }: { requestId: number }) {
  const trpc = useTRPC();

  const { data: shareRequest } = useSuspenseQuery(
    trpc.sharing.getShareRequest.queryOptions({ requestId: requestId }),
  );
  if (shareRequest.itemType === "game") {
    return <GameRequestPage game={shareRequest} />;
  } else {
    return <div>Not implemented</div>;
  }
}
