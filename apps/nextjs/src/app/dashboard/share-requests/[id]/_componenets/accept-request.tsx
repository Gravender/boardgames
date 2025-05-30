"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";
import GameRequestPage from "./game-request";
import MatchRequestPage from "./match-request";
import PlayerRequestPage from "./player-request";

export default function ShareRequestPage({ requestId }: { requestId: number }) {
  const trpc = useTRPC();

  const { data: shareRequest } = useSuspenseQuery(
    trpc.sharing.getShareRequest.queryOptions({ requestId: requestId }),
  );
  if (shareRequest.itemType === "game") {
    return <GameRequestPage game={shareRequest} requestId={requestId} />;
  }
  if (shareRequest.itemType === "match") {
    return <MatchRequestPage match={shareRequest} requestId={requestId} />;
  }
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (shareRequest.itemType === "player") {
    return <PlayerRequestPage player={shareRequest} requestId={requestId} />;
  } else {
    return <div>Not implemented</div>;
  }
}
