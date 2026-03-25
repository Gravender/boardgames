/**
 * Recompute match_player placements after score-derived ordering changes.
 * Preserves legacy delete-player behavior.
 */
export const recomputeMatchPlayerPlacements = (
  matchPlayers: { id: number; placement: number | null }[],
  finalPlacements: { id: number; score: number | null }[],
) => {
  const originalPlacements = new Map(
    matchPlayers.map((p) => [p.id, p.placement]),
  );

  return finalPlacements.map((placement) => {
    const higher = finalPlacements.filter((candidate) => {
      if (candidate.score == null && placement.score == null) return false;
      if (candidate.score == null) return false;
      if (placement.score == null) return true;
      return candidate.score > placement.score;
    }).length;

    const tiedHigher = finalPlacements.filter((candidate) => {
      const candidatePlacement = originalPlacements.get(candidate.id);
      const currentPlacement = originalPlacements.get(placement.id);
      if (candidatePlacement == null || currentPlacement == null) return false;
      return (
        candidate.score === placement.score &&
        candidatePlacement < currentPlacement
      );
    }).length;

    return {
      id: placement.id,
      score: placement.score,
      placement: 1 + higher + tiedHigher,
    };
  });
};
