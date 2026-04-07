"use client";

import { Badge } from "@board-games/ui/badge";

const TITLE =
  "Match seat is shared but this player is not shared under Players (scoresheets).";

type SharePlayerMismatchBadgeProps = {
  className?: string;
};

/**
 * Amber badge for match-player vs scoresheet-player mismatch (advanced share).
 */
export const SharePlayerMismatchBadge = ({
  className,
}: SharePlayerMismatchBadgeProps) => {
  return (
    <Badge
      variant="outline"
      className={
        className ??
        "border-amber-500/50 bg-amber-500/10 text-[0.625rem] text-amber-950 dark:text-amber-100"
      }
      title={TITLE}
    >
      Unlinked
    </Badge>
  );
};
