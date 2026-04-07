import type { RouterOutputs } from "@board-games/api";

import type { GameToShareMatchRow } from "./share-preview";

export type GameToShareMatch = GameToShareMatchRow;

type ScoresheetWinCondition =
  RouterOutputs["game"]["getGameToShare"]["scoresheets"][number]["winCondition"];

export type ShareMatchSortId =
  | "date_desc"
  | "date_asc"
  | "players_desc"
  | "players_asc"
  | "location_asc"
  | "name_asc"
  | "status_finished_first";

export type MatchPlayerDetailRow = {
  placement: number;
  rankLabel: string;
  playerName: string;
  teamName: string | null;
  teamId: number | null;
  outcomeLabel: string;
  scoreDisplay: string | null;
  isWinner: boolean | null;
};

export type MatchTeamGroup = {
  teamId: number;
  name: string;
  placement: number;
  winner: boolean;
  /** Score on the team header row — mirrors match summary (`firstTeamPlayer?.score`). */
  teamRowScore: number | null;
  players: MatchPlayerDetailRow[];
};

export type MatchShareOrderedItem =
  | { kind: "team"; team: MatchTeamGroup }
  | { kind: "solo"; player: MatchPlayerDetailRow };

export type MatchShareGroupedDetail = {
  summaryLines: string[];
  winCondition: ScoresheetWinCondition;
  showScores: boolean;
  isManual: boolean;
  orderedItems: MatchShareOrderedItem[];
};

const ordinal = (n: number): string => {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
};

const outcomeForPlayer = (
  finished: boolean,
  isWinner: boolean | null,
): string => {
  if (!finished) return "In progress";
  if (isWinner === true) return "Won";
  if (isWinner === false) return "Lost";
  return "Undecided";
};

/**
 * Mock-only: which win-condition UI to mirror when not derived from
 * `match.scoresheetId` (wire to scoresheet win condition when needed).
 */
export function getMockMatchWinCondition(
  matchId: number,
): ScoresheetWinCondition {
  const manual: Record<number, true> = {
    106: true,
  };
  return manual[matchId] ? "Manual" : "Highest Score";
}

function buildInProgressRows(m: GameToShareMatch): MatchPlayerDetailRow[] {
  const sorted = [...m.players].toSorted((a, b) =>
    a.name.localeCompare(b.name),
  );
  return sorted.map((p) => ({
    placement: 0,
    rankLabel: "—",
    playerName: p.name,
    teamName: p.team?.name ?? null,
    teamId: p.team?.id ?? null,
    outcomeLabel: outcomeForPlayer(m.finished, p.isWinner),
    scoreDisplay: p.score !== null ? String(p.score) : null,
    isWinner: p.isWinner,
  }));
}

function buildFinishedPlayerRows(
  m: GameToShareMatch,
  showScores: boolean,
): MatchPlayerDetailRow[] {
  const sorted = [...m.players].toSorted((a, b) => {
    if (showScores) {
      const as = a.score ?? Number.NEGATIVE_INFINITY;
      const bs = b.score ?? Number.NEGATIVE_INFINITY;
      if (bs !== as) return bs - as;
      return a.name.localeCompare(b.name);
    }
    const aw = a.isWinner === true ? 2 : a.isWinner === false ? 1 : 0;
    const bw = b.isWinner === true ? 2 : b.isWinner === false ? 1 : 0;
    if (bw !== aw) return bw - aw;
    return a.name.localeCompare(b.name);
  });

  const placements: number[] = new Array(sorted.length);
  if (showScores) {
    let i = 0;
    while (i < sorted.length) {
      const sc = sorted[i]?.score;
      let j = i + 1;
      while (j < sorted.length && sorted[j]?.score === sc) j++;
      const rank = i + 1;
      for (let k = i; k < j; k++) placements[k] = rank;
      i = j;
    }
  } else {
    for (let i = 0; i < sorted.length; i++) placements[i] = i + 1;
  }

  return sorted.map((p, i) => ({
    placement: placements[i] ?? i + 1,
    rankLabel: ordinal(placements[i] ?? i + 1),
    playerName: p.name,
    teamName: p.team?.name ?? null,
    teamId: p.team?.id ?? null,
    outcomeLabel: outcomeForPlayer(m.finished, p.isWinner),
    scoreDisplay: showScores && p.score !== null ? String(p.score) : null,
    isWinner: p.isWinner,
  }));
}

function buildOrderedItems(
  m: GameToShareMatch,
  rows: MatchPlayerDetailRow[],
  showScores: boolean,
  finished: boolean,
): MatchShareOrderedItem[] {
  if (!finished) {
    const items: MatchShareOrderedItem[] = [];
    for (const t of m.teams) {
      const members = rows
        .filter((r) => r.teamId === t.id)
        .toSorted((a, b) => a.playerName.localeCompare(b.playerName));
      if (members.length === 0) continue;
      items.push({
        kind: "team",
        team: {
          teamId: t.id,
          name: t.name,
          placement: 0,
          winner: false,
          teamRowScore: null,
          players: members,
        },
      });
    }
    const solo = rows
      .filter((r) => r.teamId === null)
      .toSorted((a, b) => a.playerName.localeCompare(b.playerName));
    for (const p of solo) {
      items.push({ kind: "solo", player: p });
    }
    return items.toSorted((a, b) => {
      const na = a.kind === "team" ? a.team.name : a.player.playerName;
      const nb = b.kind === "team" ? b.team.name : b.player.playerName;
      return na.localeCompare(nb);
    });
  }

  const items: MatchShareOrderedItem[] = [];

  for (const t of m.teams) {
    const members = rows
      .filter((r) => r.teamId === t.id)
      .toSorted((a, b) => {
        if (a.placement !== b.placement) return a.placement - b.placement;
        return a.playerName.localeCompare(b.playerName);
      });
    if (members.length === 0) continue;
    const placement = Math.min(...members.map((x) => x.placement));
    const winner = members.some((x) => x.isWinner === true);
    const first = members[0];
    const teamRowScore =
      showScores && first?.scoreDisplay != null
        ? Number.parseFloat(first.scoreDisplay)
        : null;
    const parsedTeamScore =
      teamRowScore != null && Number.isFinite(teamRowScore)
        ? teamRowScore
        : null;
    items.push({
      kind: "team",
      team: {
        teamId: t.id,
        name: t.name,
        placement,
        winner,
        teamRowScore: parsedTeamScore,
        players: members,
      },
    });
  }

  const solo = rows
    .filter((r) => r.teamId === null)
    .toSorted((a, b) => {
      if (a.placement !== b.placement) return a.placement - b.placement;
      return a.playerName.localeCompare(b.playerName);
    });
  for (const p of solo) {
    items.push({ kind: "solo", player: p });
  }

  return items.toSorted((a, b) => {
    const pa = a.kind === "team" ? a.team.placement : a.player.placement;
    const pb = b.kind === "team" ? b.team.placement : b.player.placement;
    if (pa !== pb) return pa - pb;
    const na = a.kind === "team" ? a.team.name : a.player.playerName;
    const nb = b.kind === "team" ? b.team.name : b.player.playerName;
    return na.localeCompare(nb);
  });
}

export function getMatchShareGroupedDetail(
  m: GameToShareMatch,
): MatchShareGroupedDetail {
  const loc = m.location?.name
    ? `Location: ${m.location.name}`
    : "No location recorded.";
  const summaryLines = [
    `${m.finished ? "Finished" : "In progress"} · ${m.duration} min · ${m.players.length} players`,
    loc,
  ];

  const winCondition = getMockMatchWinCondition(m.id);
  const isManual = winCondition === "Manual";

  const showScores = m.finished && m.players.some((p) => p.score !== null);

  if (!m.finished) {
    const rows = buildInProgressRows(m);
    const orderedItems = buildOrderedItems(m, rows, false, false);
    return {
      summaryLines,
      winCondition,
      showScores: false,
      isManual,
      orderedItems,
    };
  }

  const rows = buildFinishedPlayerRows(m, showScores);
  const orderedItems = buildOrderedItems(m, rows, showScores, true);

  return {
    summaryLines,
    winCondition,
    showScores,
    isManual,
    orderedItems,
  };
}

export function sortShareMatches(
  list: GameToShareMatch[],
  sortId: ShareMatchSortId,
): GameToShareMatch[] {
  const copy = [...list];
  switch (sortId) {
    case "date_desc":
      copy.sort((a, b) => b.date.getTime() - a.date.getTime());
      break;
    case "date_asc":
      copy.sort((a, b) => a.date.getTime() - b.date.getTime());
      break;
    case "players_desc":
      copy.sort((a, b) => b.players.length - a.players.length);
      break;
    case "players_asc":
      copy.sort((a, b) => a.players.length - b.players.length);
      break;
    case "location_asc":
      copy.sort((a, b) =>
        (a.location?.name ?? "").localeCompare(b.location?.name ?? ""),
      );
      break;
    case "name_asc":
      copy.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "status_finished_first":
      copy.sort((a, b) => {
        if (a.finished === b.finished) {
          return b.date.getTime() - a.date.getTime();
        }
        return a.finished ? -1 : 1;
      });
      break;
    default:
      break;
  }
  return copy;
}
