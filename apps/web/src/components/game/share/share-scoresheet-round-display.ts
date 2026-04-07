import type { CSSProperties } from "react";

import type { GameToShare } from "./types";

export type ShareScoresheetRound =
  GameToShare["scoresheets"][number]["rounds"][number];

const FALLBACK_ROUND_MARKER_CLASS =
  "border-border bg-muted text-foreground border-2";

/** Round list marker: `borderColor` + `color` from DB, like stats round column badges. */
export const shareRoundMarkerProps = (
  color: string | null | undefined,
): { className: string; style?: CSSProperties } => {
  const c = color?.trim();
  if (!c) {
    return { className: FALLBACK_ROUND_MARKER_CLASS };
  }
  return {
    className: "border-2 font-bold tabular-nums",
    style: {
      borderColor: c,
      color: c,
    },
  };
};

export const shareRoundDetailDescription = (
  round: Pick<ShareScoresheetRound, "type" | "score">,
): string => {
  if (round.type === "Checkbox") {
    return "Checkbox round — mark completion per session.";
  }
  if (round.score !== 0) {
    return `Numeric round — default score ${round.score} when entering values.`;
  }
  return "Numeric round — scores aggregate per your scoresheet rules.";
};
