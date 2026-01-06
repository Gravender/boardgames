type formatMatchLinkType =
  | {
      matchId: number;
      gameId: number;
      type: "original";
      finished: boolean;
    }
  | {
      sharedMatchId: number;
      sharedGameId: number;
      type: "shared" | "linked";
      linkedGameId?: number | null;
      finished: boolean;
    };
export function formatMatchLink(input: formatMatchLinkType) {
  if (input.type === "original") {
    return `/dashboard/games/${input.gameId}/${input.matchId}${input.finished ? "/summary" : ""}`;
  }
  if (input.type === "shared") {
    return `/dashboard/games/shared/${input.sharedGameId}/${input.sharedMatchId}${input.finished ? "/summary" : ""}`;
  } else {
    return `/dashboard/games/shared/${input.sharedGameId}/${input.sharedMatchId}${input.finished ? "/summary" : ""}`;
  }
}
