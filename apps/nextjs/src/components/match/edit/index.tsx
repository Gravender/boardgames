import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import type { GameInput, MatchInput } from "../types/input";
import { MatchNotFound } from "~/components/match/MatchNotFound";
import { prefetch, trpc } from "~/trpc/server";
import {
  EditSharedMatchForm,
  EditSharedMatchSkeleton,
} from "./sharedMatchForm";

export function EditMatch(input: { game: GameInput; match: MatchInput }) {
  prefetch(trpc.newMatch.getMatch.queryOptions(input.match));
  if (input.match.type === "shared") {
    prefetch(
      trpc.location.shared.getSharedLocationsFromSharedMatch.queryOptions({
        sharedMatchId: input.match.sharedMatchId,
      }),
    );
  }
  return (
    <ErrorBoundary fallback={<MatchNotFound />}>
      <div className="flex w-full items-center justify-center">
        {input.match.type === "shared" && (
          <Suspense fallback={<EditSharedMatchSkeleton />}>
            <EditSharedMatchForm game={input.game} match={input.match} />
          </Suspense>
        )}
      </div>
    </ErrorBoundary>
  );
}
