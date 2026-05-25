import type { RouterOutputs } from "@board-games/api";

import { getMatchHref } from "~/components/link";

type PlayerIdentity =
  RouterOutputs["player"]["stats"]["getPlayerTopRivals"]["rivals"][number]["opponent"];

export const insightPlayerProfileHref = (p: PlayerIdentity): string => {
  if (p.type === "original") {
    return `/players/${p.id}/stats`;
  }
  return `/players/shared/${p.sharedId}/stats`;
};

/** Any insight match row that carries enough fields to build a summary URL. */
type MatchEntryForInsightHref =
  | RouterOutputs["player"]["stats"]["getPlayerRecentMatches"]["matches"][number]
  | RouterOutputs["player"]["stats"]["getPlayerPlayedWithGroups"]["playedWithGroups"][number]["recentMatches"][number];

export const insightMatchHref = (match: MatchEntryForInsightHref): string => {
  if (match.type === "shared") {
    if (match.game.type === "shared") {
      return getMatchHref({
        sharedGameId: match.game.sharedGameId,
        sharedMatchId: match.sharedMatchId,
        segment: "summary",
      });
    }
    return "";
  }
  if (match.game.type === "shared") {
    return "";
  }
  return getMatchHref({
    gameId: match.game.id,
    matchId: match.matchId,
    segment: "summary",
  });
};
