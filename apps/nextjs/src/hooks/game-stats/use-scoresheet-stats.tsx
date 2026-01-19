import { useEffect, useMemo, useState } from "react";
import { compareAsc, format } from "date-fns";

import type { RouterOutputs } from "@board-games/api";

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type Player = GameStats["players"][number];
type Scoresheet = GameStats["scoresheets"][number];

type SortField =
  | "name"
  | "plays"
  | "wins"
  | "winRate"
  | "bestScore"
  | "worstScore"
  | "avgScore";
type SortOrder = "asc" | "desc";

interface CurrentPlayer {
  id: number;
  type: "original" | "shared";
  name: string;
  image: Player["image"];
  isUser: boolean;
  bestScore: number | null;
  worstScore: number | null;
  avgScore: number | null;
  winRate: number;
  plays: number;
  wins: number;
  rounds: Player["scoresheets"][number]["rounds"];
  scores: Player["scoresheets"][number]["scores"];
}

export function useScoresheetStats({
  players,
  scoresheets,
}: {
  players: Player[];
  scoresheets: Scoresheet[];
}) {
  const scoreSheetsWithGames = useMemo(() => {
    const temp = [...scoresheets];
    return temp
      .map((s) => {
        const plays = players.reduce((acc, p) => {
          const foundScoresheet = p.scoresheets.find((ps) => ps.id === s.id);
          if (foundScoresheet !== undefined) {
            return Math.max(acc, foundScoresheet.plays);
          }
          return acc;
        }, 0);
        if (plays === 0) {
          return null;
        }
        return {
          ...s,
          plays,
        };
      })
      .filter((s) => s !== null) as (Scoresheet & { plays: number })[];
  }, [players, scoresheets]);

  const [currentScoresheet, setCurrentScoresheet] = useState<Scoresheet | null>(
    scoreSheetsWithGames[0] ?? null,
  );

  useEffect(() => {
    if (currentScoresheet) {
      const stillExists = scoreSheetsWithGames.some(
        (s) => s.id === currentScoresheet.id,
      );
      if (!stillExists) {
        setCurrentScoresheet(scoreSheetsWithGames[0] ?? null);
      }
    } else {
      setCurrentScoresheet(scoreSheetsWithGames[0] ?? null);
    }
  }, [scoreSheetsWithGames, currentScoresheet]);

  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const currentPlayers = useMemo(() => {
    if (!currentScoresheet) return [];
    const mappedPlayers = players
      .map((player) => {
        const playerScoresheet = player.scoresheets.find(
          (pScoresheet) => pScoresheet.id === currentScoresheet.id,
        );
        if (!playerScoresheet) return null;

        return {
          id: player.id,
          type: player.type,
          name: player.name,
          image: player.image,
          isUser: player.isUser,
          bestScore: playerScoresheet.bestScore,
          worstScore: playerScoresheet.worstScore,
          avgScore: playerScoresheet.avgScore,
          winRate: playerScoresheet.winRate,
          plays: playerScoresheet.plays,
          wins: playerScoresheet.wins,
          rounds: playerScoresheet.rounds,
          scores: playerScoresheet.scores,
        };
      })
      .filter((player): player is CurrentPlayer => player !== null);
    return mappedPlayers;
  }, [currentScoresheet, players]);

  const userScore = useMemo(() => {
    const temp = currentPlayers.find((p) => p.isUser);
    return temp ?? null;
  }, [currentPlayers]);

  const sortedPlayers = useMemo(() => {
    const temp = [...currentPlayers];
    temp.sort((a, b) => {
      let aValue: number | string | null;
      let bValue: number | string | null;

      switch (sortField) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "plays":
          aValue = a.plays;
          bValue = b.plays;
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
  }, [currentPlayers, currentScoresheet?.winCondition, sortField, sortOrder]);

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
    const winRateOverTime = userScoresSorted.map((score) => {
      if (score.isWin) {
        wins++;
      }
      totalGames++;
      return {
        date: score.date,
        winRate: (wins / totalGames) * 100,
      };
    });
    return winRateOverTime;
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
    sortField,
    sortOrder,
    toggleSort,
    currentPlayers,
    userScore,
    sortedPlayers,
    scoreSheetsWithGames,
    userScoresSorted,
    winRateOverTime,
  };
}
