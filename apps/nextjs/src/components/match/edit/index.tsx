import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import type { GameInput, MatchInput } from "../types/input";
import { MatchNotFound } from "~/components/match/MatchNotFound";
import { prefetch, trpc } from "~/trpc/server";
import {
  EditOriginalMatchForm,
  EditOriginalMatchSkeleton,
} from "./originalMatchForm";
import {
  EditSharedMatchForm,
  EditSharedMatchSkeleton,
} from "./sharedMatchForm";

type EditMatchType =
  | {
      game: Extract<GameInput, { type: "original" }>;
      match: Extract<MatchInput, { type: "original" }>;
    }
  | {
      game: Extract<GameInput, { type: "shared" }>;
      match: Extract<MatchInput, { type: "shared" }>;
    };
export function EditMatch(input: EditMatchType) {
  prefetch(trpc.newMatch.getMatch.queryOptions(input.match));
  if (input.match.type === "shared") {
    prefetch(
      trpc.location.shared.getSharedLocationsFromSharedMatch.queryOptions({
        sharedMatchId: input.match.sharedMatchId,
      }),
    );
  } else {
    prefetch(trpc.newMatch.getMatchPlayersAndTeams.queryOptions(input.match));
    prefetch(trpc.location.getLocations.queryOptions());
    prefetch(trpc.newPlayer.getRecentMatchWithPlayers.queryOptions());
    prefetch(trpc.newPlayer.getPlayersForMatch.queryOptions());
    prefetch(trpc.newGroup.getGroupsWithPlayers.queryOptions());
    prefetch(
      trpc.newGame.gameRoles.queryOptions({
        id:
          input.game.type === "original"
            ? input.game.id
            : input.game.sharedGameId,
        type: "original",
      }),
    );
    prefetch(trpc.newPlayer.getPlayersForMatch.queryOptions());
  }
  return (
    <ErrorBoundary fallback={<MatchNotFound />}>
      <div className="flex w-full items-center justify-center">
        {input.match.type === "shared" && (
          <Suspense fallback={<EditSharedMatchSkeleton />}>
            <EditSharedMatchForm game={input.game} match={input.match} />
          </Suspense>
        )}
        {input.match.type === "original" && (
          <Suspense fallback={<EditOriginalMatchSkeleton />}>
            <EditOriginalMatchForm game={input.game} match={input.match} />
          </Suspense>
        )}
      </div>
    </ErrorBoundary>
  );
}
