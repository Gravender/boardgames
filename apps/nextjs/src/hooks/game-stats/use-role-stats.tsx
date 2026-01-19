import { useMemo, useState } from "react";

import type { RouterOutputs } from "@board-games/api";

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type RoleStats = GameStats["roleStats"][number];
type PlayerStats = GameStats["players"][number];

export function formatPlacementDistribution(
  placements: Record<number, number>,
) {
  const total = Object.values(placements).reduce(
    (sum, count) => sum + count,
    0,
  );
  if (total === 0) return null;

  const avgPlacement =
    Object.entries(placements).reduce((sum, [place, count]) => {
      return sum + Number.parseInt(place) * count;
    }, 0) / total;
  if (avgPlacement === 0) return null;

  return avgPlacement.toFixed(1);
}

export function useRoleStats({
  roleStats,
  userStats,
  players,
}: {
  roleStats: RoleStats[];
  userStats: PlayerStats | undefined;
  players: PlayerStats[];
}) {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(
    players[0] ?? null,
  );
  const [selectedRole, setSelectedRole] = useState<RoleStats | null>(
    roleStats[0] ?? null,
  );
  const [playerComboboxOpen, setPlayerComboboxOpen] = useState(false);
  const [roleComboboxOpen, setRoleComboboxOpen] = useState(false);

  const topFiveRoles = useMemo(() => {
    const sortedRoles = roleStats.toSorted((a, b) => {
      if (a.winRate === b.winRate) {
        return a.name.localeCompare(b.name);
      }
      if (a.matchCount > 10 && b.matchCount > 10) {
        return b.winRate - a.winRate;
      }
      if (a.matchCount > 10 && b.matchCount <= 10) {
        return -1;
      }
      if (a.matchCount <= 10 && b.matchCount > 10) {
        return 1;
      }
      return b.matchCount - a.matchCount;
    });
    return sortedRoles.slice(0, 5);
  }, [roleStats]);

  const roleRecommendations = useMemo(() => {
    if (!userStats) return [];

    return userStats.roles
      .filter((role) => role.matchCount >= 5)
      .sort((a, b) => {
        // Sort by win rate, then by match count
        if (Math.abs(a.winRate - b.winRate) > 0.1) return b.winRate - a.winRate;
        return b.matchCount - a.matchCount;
      })
      .map((role, index) => ({
        ...role,
        rank: index + 1,
        recommendation:
          index === 0
            ? "Best"
            : index === 1
              ? "Good"
              : index === 2
                ? "Average"
                : "Consider Improving",
      }));
  }, [userStats]);

  const bestRoleCombos = useMemo(() => {
    if (!userStats) return [];

    return userStats.roleCombos
      .filter((combo) => combo.matchCount >= 5)
      .sort((a, b) => {
        if (Math.abs(a.winRate - b.winRate) > 0.1) return b.winRate - a.winRate;
        return b.matchCount - a.matchCount;
      })
      .slice(0, 6);
  }, [userStats]);

  const selectedRoleAvgPlacement = useMemo(() => {
    if (!selectedRole) return null;
    return formatPlacementDistribution(selectedRole.placements);
  }, [selectedRole]);

  const selectedPlayerAvgPlacement = useMemo(() => {
    if (!selectedPlayer) return null;
    return formatPlacementDistribution(selectedPlayer.placements);
  }, [selectedPlayer]);

  return {
    selectedPlayer,
    setSelectedPlayer,
    selectedRole,
    setSelectedRole,
    playerComboboxOpen,
    setPlayerComboboxOpen,
    roleComboboxOpen,
    setRoleComboboxOpen,
    topFiveRoles,
    roleRecommendations,
    bestRoleCombos,
    selectedRoleAvgPlacement,
    selectedPlayerAvgPlacement,
    formatPlacementDistribution,
  };
}
