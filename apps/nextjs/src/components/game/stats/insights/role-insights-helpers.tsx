import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";

import { PlayerImage } from "~/components/player-image";

// ─── Types ──────────────────────────────────────────────────────

export type Insights = RouterOutputs["game"]["getGameInsights"];
export type RolesData = NonNullable<Insights["roles"]>;
export type RoleSummary = RolesData["roles"][number];
export type RolePresenceEffect = RolesData["presenceEffects"][number];
export type PlayerRolePerformance = RolesData["playerPerformance"][number];
export type CorePlayer = RolePresenceEffect["playerEffects"][number]["player"];

export type WinCondition = RolesData["winCondition"];
export type RoleSortKey =
  | "name"
  | "winRate"
  | "avgPlacement"
  | "avgScore"
  | "matchCount";
export type SortDirection = "asc" | "desc";

export interface RoleInsightsProps {
  roles: RolesData;
}

// ─── Helpers ──────────────────────────────────────────────────────

export const formatPercent = (value: number): string =>
  `${Math.round(value * 100)}%`;

// ─── Shared Components ───────────────────────────────────────────

export const PlayerAvatar = ({
  player,
  className,
}: {
  player: CorePlayer;
  className?: string;
}) => (
  <PlayerImage
    image={player.image}
    alt={player.playerName}
    className={className}
  />
);

export const ClassificationBadge = ({
  classification,
}: {
  classification: "unique" | "team" | "shared";
}) => {
  const config = {
    unique: { label: "Unique", variant: "default" as const },
    team: { label: "Team", variant: "secondary" as const },
    shared: { label: "Shared", variant: "outline" as const },
  };
  const { label, variant } = config[classification];
  return (
    <Badge variant={variant} className="text-xs">
      {label}
    </Badge>
  );
};
