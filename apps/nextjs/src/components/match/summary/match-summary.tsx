import { Suspense } from "react";

import { prefetch, trpc } from "~/trpc/server";
import GamePreviousMatches, {
  GamePreviousMatchesSkeleton,
} from "./game-previous-matches";
import MatchCard, { MatchCardSkeleton } from "./match-card";
import MatchSummaryPlayerStats, {
  MatchSummaryPlayerStatsSkeleton,
} from "./match-player-stats";
import ShareMatchResults, {
  ShareMatchResultsSkeleton,
} from "./share-match-results";

export default function MatchSummary({
  id,
  gameId,
  type,
}: {
  id: number;
  gameId: number;
  type: "original" | "shared";
}) {
  void prefetch(
    trpc.newMatch.getMatch.queryOptions({
      id: id,
      type: type,
    }),
  );
  void prefetch(
    trpc.newMatch.getMatchScoresheet.queryOptions({
      id: id,
      type: type,
    }),
  );
  void prefetch(
    trpc.newMatch.getMatchPlayersAndTeams.queryOptions({
      id: id,
      type: type,
    }),
  );
  void prefetch(
    trpc.newMatch.getMatchSummary.queryOptions({
      id: id,
      type: type,
    }),
  );
  void prefetch(
    trpc.newGame.gameMatches.queryOptions({
      id: gameId,
      type: type,
    }),
  );
  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex max-w-6xl flex-1 flex-col items-center gap-4 pt-0 sm:p-4">
        <Suspense fallback={<MatchCardSkeleton />}>
          <MatchCard id={id} type={type} />
        </Suspense>
        <Suspense fallback={<ShareMatchResultsSkeleton />}>
          <ShareMatchResults id={id} type={type} />
        </Suspense>
        <Suspense fallback={<GamePreviousMatchesSkeleton />}>
          <GamePreviousMatches id={gameId} type={type} />
        </Suspense>
        <Suspense fallback={<MatchSummaryPlayerStatsSkeleton />}>
          <MatchSummaryPlayerStats id={id} type={type} />
        </Suspense>
      </div>
    </div>
  );
}
