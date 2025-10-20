import { Suspense } from "react";

import type { GameInput, MatchInput } from "../types/input";
import { prefetch, trpc } from "~/trpc/server";
import { GamePreviousMatches } from "./game-previous-matches";
import { MatchCard, MatchCardSkeleton } from "./match-card";
import {
  MatchSummaryPlayerStats,
  MatchSummaryPlayerStatsSkeleton,
} from "./match-player-stats";
import {
  ShareMatchResults,
  ShareMatchResultsSkeleton,
} from "./share-match-results";

export default function MatchSummary(input: {
  game: GameInput;
  match: MatchInput;
}) {
  void prefetch(trpc.newMatch.getMatch.queryOptions(input.match));
  void prefetch(trpc.newMatch.getMatchScoresheet.queryOptions(input.match));
  void prefetch(
    trpc.newMatch.getMatchPlayersAndTeams.queryOptions(input.match),
  );
  void prefetch(trpc.newMatch.getMatchSummary.queryOptions(input.match));
  void prefetch(trpc.newGame.gameMatches.queryOptions(input.game));
  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex max-w-6xl flex-1 flex-col items-center gap-4 pt-0 sm:p-4">
        <Suspense fallback={<MatchCardSkeleton />}>
          <MatchCard match={input.match} />
        </Suspense>
        <Suspense fallback={<ShareMatchResultsSkeleton />}>
          <ShareMatchResults match={input.match} />
        </Suspense>
        <Suspense fallback={null}>
          <GamePreviousMatches game={input.game} />
        </Suspense>
        <Suspense fallback={<MatchSummaryPlayerStatsSkeleton />}>
          <MatchSummaryPlayerStats match={input.match} />
        </Suspense>
      </div>
    </div>
  );
}
