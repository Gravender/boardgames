import { useEffect, useMemo, useState } from "react";
import { compareAsc, format } from "date-fns";

import type { RouterOutputs } from "@board-games/api";

type ScoresheetStats = RouterOutputs["newGame"]["getGameScoresheetStats"];
type ScoresheetStatsItem = ScoresheetStats[number];
type OverallPlayer = ScoresheetStatsItem["players"][number];

type SortField =
  | "name"
  | "plays"
  | "wins"
  | "winRate"
  | "bestScore"
  | "worstScore"
  | "avgScore";
type SortOrder = "asc" | "desc";

function getScoresheetKey(s: ScoresheetStatsItem): string {
  return `${s.type}-${s.type === "original" ? s.id : s.sharedId}`;
}

export function getCurrentPlayerKey(player: OverallPlayer): string {
  return player.type === "original"
    ? `original-${player.playerId}`
    : `shared-${player.sharedId}`;
}

export function useScoresheetStats({
  scoresheetStats,
}: {
  scoresheetStats: ScoresheetStats;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(() =>
    scoresheetStats[0] ? getScoresheetKey(scoresheetStats[0]) : null,
  );

  const currentScoresheet: ScoresheetStatsItem | null = useMemo(() => {
    if (selectedKey === null) return scoresheetStats[0] ?? null;
    return (
      scoresheetStats.find((s) => getScoresheetKey(s) === selectedKey) ??
      scoresheetStats[0] ??
      null
    );
  }, [scoresheetStats, selectedKey]);

  const setCurrentScoresheet = (s: ScoresheetStatsItem | null) => {
    setSelectedKey(s ? getScoresheetKey(s) : null);
  };

  useEffect(() => {
    if (currentScoresheet) {
      const key = getScoresheetKey(currentScoresheet);
      const stillExists = scoresheetStats.some(
        (s) => getScoresheetKey(s) === key,
      );
      if (!stillExists) {
        setSelectedKey(
          scoresheetStats[0] ? getScoresheetKey(scoresheetStats[0]) : null,
        );
      }
    } else {
      setSelectedKey(
        scoresheetStats[0] ? getScoresheetKey(scoresheetStats[0]) : null,
      );
    }
  }, [scoresheetStats, currentScoresheet]);

  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const userScore = useMemo(() => {
    const temp = currentScoresheet?.players.find((p) => p.isUser);
    return temp ?? null;
  }, [currentScoresheet]);

  const sortedPlayers = useMemo(() => {
    const temp = [...(currentScoresheet?.players ?? [])];
    temp.sort((a, b) => {
      let aValue: number | string | null;
      let bValue: number | string | null;

      switch (sortField) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "plays":
          aValue = a.numMatches;
          bValue = b.numMatches;
          break;
        case "wins":
          aValue = a.wins;
          bValue = b.wins;
          break;
        case "winRate":
          aValue = a.winRate;
          bValue = b.winRate;
          break;
        case "bestScore":
          aValue = a.bestScore;
          bValue = b.bestScore;
          break;
        case "worstScore":
          aValue = a.worstScore;
          bValue = b.worstScore;
          break;
        case "avgScore":
          aValue = a.avgScore;
          bValue = b.avgScore;
          break;
        default:
          aValue = a.winRate;
          bValue = b.winRate;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      if (sortField.includes("Score")) {
        if (currentScoresheet?.winCondition === "Lowest Score") {
          return sortOrder === "asc"
            ? (aValue as number) - (bValue as number)
            : (bValue as number) - (aValue as number);
        }
        if (currentScoresheet?.winCondition === "Highest Score") {
          return sortOrder === "asc"
            ? (bValue as number) - (aValue as number)
            : (aValue as number) - (bValue as number);
        }
      }
      return sortOrder === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
    return temp;
  }, [
    currentScoresheet?.players,
    currentScoresheet?.winCondition,
    sortField,
    sortOrder,
  ]);

  const userScoresSorted = useMemo(() => {
    if (!userScore) return [];
    return userScore.scores
      .toSorted((a, b) => compareAsc(a.date, b.date))
      .map((score) => ({
        ...score,
        date: format(score.date, "MMMM d, yyyy"),
      }));
  }, [userScore]);

  const winRateOverTime = useMemo(() => {
    let wins = 0;
    let totalGames = 0;
    return userScoresSorted.map((score) => {
      if (score.isWin) {
        wins++;
      }
      totalGames++;
      return {
        date: score.date,
        winRate: (wins / totalGames) * 100,
      };
    });
  }, [userScoresSorted]);

  const toggleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return {
    currentScoresheet,
    setCurrentScoresheet,
    getScoresheetKey,
    getCurrentPlayerKey,
    sortField,
    sortOrder,
    toggleSort,
    userScore,
    sortedPlayers,
    userScoresSorted,
    winRateOverTime,
  };
}
