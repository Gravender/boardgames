"use client";

import { Award, Medal, Trophy } from "lucide-react";

import { getOrdinalSuffix } from "@board-games/shared";
import { cn } from "@board-games/ui/utils";

/** Border + background for a winning team or solo row (matches match summary “Match Results”). */
export const matchResultWinnerSurfaceClass = (winner: boolean) =>
  winner ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20" : "";

/**
 * Trophy / medal / ordinal / manual ✓✗ — same rules as {@link ShareMatchResults}.
 */
export const MatchOutcomePlacementIcons = ({
  placement,
  isManual,
  isWinner,
  className,
}: {
  placement: number | null | undefined;
  isManual: boolean;
  isWinner: boolean;
  className?: string;
}) => {
  if (isManual) {
    return isWinner ? (
      <span aria-label="Winner" role="img" className={className}>
        ✔️
      </span>
    ) : (
      <span aria-label="Not winner" role="img" className={className}>
        ❌
      </span>
    );
  }

  const p = placement ?? 0;
  if (p <= 0) return null;

  if (p === 1) {
    return (
      <Trophy
        className={cn("h-5 w-5 text-yellow-500", className)}
        aria-label="1st place"
      />
    );
  }
  if (p === 2) {
    return (
      <Medal
        className={cn("h-5 w-5 text-gray-400", className)}
        aria-label="2nd place"
      />
    );
  }
  if (p === 3) {
    return (
      <Award
        className={cn("h-5 w-5 text-amber-700", className)}
        aria-label="3rd place"
      />
    );
  }
  return (
    <div
      className={cn(
        "flex h-6 w-6 items-center justify-center p-1 text-sm font-semibold",
        className,
      )}
      aria-label={`${p}${getOrdinalSuffix(p)} place`}
    >
      {p}
      {getOrdinalSuffix(p)}
    </div>
  );
};
