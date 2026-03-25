import type { RouterOutputs } from "@board-games/api";

type PlayerIdentity =
  RouterOutputs["newPlayer"]["stats"]["getPlayerTopRivals"]["rivals"][number]["opponent"];

export const insightPlayerProfileHref = (p: PlayerIdentity): string => {
  if (p.type === "original") {
    return `/dashboard/players/${p.id}/stats`;
  }
  return `/dashboard/players/shared/${p.sharedId}/stats`;
};

/** Any insight match row that carries enough fields to build a summary URL. */
type MatchEntryForInsightHref =
  | RouterOutputs["newPlayer"]["stats"]["getPlayerRecentMatches"]["matches"][number]
  | RouterOutputs["newPlayer"]["stats"]["getPlayerPlayedWithGroups"]["playedWithGroups"][number]["recentMatches"][number];

export const insightMatchHref = (match: MatchEntryForInsightHref): string => {
  if (match.type === "shared") {
    if (match.game.type === "shared") {
      return `/dashboard/games/shared/${match.game.sharedGameId}/${match.sharedMatchId}/summary`;
    }
    return "";
  }
  if (match.game.type === "shared") {
    return "";
  }
  return `/dashboard/games/${match.game.id}/${match.matchId}/summary`;
};
