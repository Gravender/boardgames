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
    return `/games/${input.gameId}/${input.matchId}${input.finished ? "/summary" : ""}`;
  }
  if (input.type === "shared") {
    return `/games/shared/${input.sharedGameId}/${input.sharedMatchId}${input.finished ? "/summary" : ""}`;
  } else {
    return `/games/shared/${input.sharedGameId}/${input.sharedMatchId}${input.finished ? "/summary" : ""}`;
  }
}
