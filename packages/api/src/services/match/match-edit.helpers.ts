import { isSameRole } from "@board-games/shared";

import type { EditMatchInputType } from "../../routers/match/match.input";

// ─── Derived input types ────────────────────────────────────────

type OriginalEditInput = Extract<EditMatchInputType, { type: "original" }>;
export type EditInputPlayer = OriginalEditInput["players"][number];
export type EditInputTeam = OriginalEditInput["teams"][number];

// ─── Shared role reference type ─────────────────────────────────

export type MatchRoleRef =
  | { id: number; type: "original" }
  | { sharedId: number; type: "shared" };

// ─── computeTeamRoles ───────────────────────────────────────────

export interface MappedTeamWithRoles {
  id: number;
  name: string;
  roles: { id: number; type: "original" }[];
}

/**
 * Compute the roles that are shared by every player on a team.
 * A role is a "team role" when every player on that team has it.
 */
export const computeTeamRoles = (
  teams: { id: number; name: string }[],
  matchPlayers: { teamId: number | null; roles: { id: number }[] }[],
): MappedTeamWithRoles[] => {
  return teams.map((team) => {
    const teamPlayers = matchPlayers.filter((mp) => mp.teamId === team.id);
    const roleCounts = new Map<number, number>();
    for (const player of teamPlayers) {
      for (const role of player.roles) {
        roleCounts.set(role.id, (roleCounts.get(role.id) ?? 0) + 1);
      }
    }
    const teamRoles: MappedTeamWithRoles["roles"] = [];
    for (const [id, count] of roleCounts) {
      if (count === teamPlayers.length) {
        teamRoles.push({ id, type: "original" as const });
      }
    }
    return { id: team.id, name: team.name, roles: teamRoles };
  });
};

// ─── computePlayerChanges ───────────────────────────────────────

export interface PlayerToRemove {
  matchPlayerId: number;
}

export interface UpdatedPlayer {
  matchPlayerId: number;
  teamId: number | null;
  rolesToAdd: MatchRoleRef[];
  rolesToRemove: { id: number }[];
}

interface ExistingMatchPlayer {
  id: number;
  playerId: number;
  teamId: number | null;
  roles: { id: number }[];
}

/**
 * Merge team-level roles into a player's roles list, de-duplicating via
 * isSameRole. Returns a new array containing all unique roles.
 */
const mergeTeamRoles = (
  playerRoles: MatchRoleRef[],
  teamId: number | null,
  inputTeams: EditInputTeam[],
): MatchRoleRef[] => {
  const merged: MatchRoleRef[] = [...playerRoles];
  const teamRoles = inputTeams.find((t) => t.id === teamId)?.roles ?? [];
  for (const role of teamRoles) {
    const alreadyPresent = merged.find((r) => isSameRole(r, role));
    if (!alreadyPresent) {
      merged.push(role);
    }
  }
  return merged;
};

/**
 * Diff the desired player list against the current match players.
 * Returns lists of players to add, remove, and update.
 */
export const computePlayerChanges = (
  inputPlayers: EditInputPlayer[],
  matchPlayers: ExistingMatchPlayer[],
  inputTeams: EditInputTeam[],
): {
  playersToAdd: EditInputPlayer[];
  playersToRemove: PlayerToRemove[];
  updatedPlayers: UpdatedPlayer[];
} => {
  const playersToRemove: PlayerToRemove[] = [];
  const playersToAdd: EditInputPlayer[] = [];
  const updatedPlayers: UpdatedPlayer[] = [];

  inputPlayers.forEach((player) => {
    const foundPlayer = matchPlayers.find(
      (p) => player.type === "original" && p.playerId === player.id,
    );
    if (foundPlayer) {
      const teamChanged = foundPlayer.teamId !== player.teamId;
      const originalRoles = foundPlayer.roles;
      const playerRoles = mergeTeamRoles(
        player.roles,
        player.teamId,
        inputTeams,
      );
      const rolesToRemove = originalRoles.filter(
        (role) =>
          !playerRoles.find((r) =>
            isSameRole(r, { id: role.id, type: "original" }),
          ),
      );
      const rolesToAdd = playerRoles.filter(
        (role) =>
          !originalRoles.find((r) =>
            isSameRole({ id: r.id, type: "original" }, role),
          ),
      );
      if (teamChanged || rolesToAdd.length > 0 || rolesToRemove.length > 0) {
        updatedPlayers.push({
          matchPlayerId: foundPlayer.id,
          teamId: player.teamId,
          rolesToAdd,
          rolesToRemove,
        });
      }
    } else {
      const playerRoles = mergeTeamRoles(
        player.roles,
        player.teamId,
        inputTeams,
      );
      playersToAdd.push({
        ...player,
        roles: playerRoles,
      });
    }
  });

  matchPlayers.forEach((mp) => {
    const foundPlayer = inputPlayers.find(
      (p) => p.type === "original" && p.id === mp.playerId,
    );
    if (!foundPlayer) {
      playersToRemove.push({ matchPlayerId: mp.id });
    }
  });

  return { playersToAdd, playersToRemove, updatedPlayers };
};

// ─── computeTeamChanges ─────────────────────────────────────────

export interface AddedTeam {
  id: number;
  name: string;
  roles: MatchRoleRef[];
}

export interface EditedTeam {
  id: number;
  name: string;
}

export interface DeletedTeam {
  id: number;
}

/**
 * Diff the desired team list against the current mapped teams.
 * Returns lists of teams to add, edit, and delete.
 */
export const computeTeamChanges = (
  inputTeams: EditInputTeam[],
  mappedTeams: MappedTeamWithRoles[],
): {
  addedTeams: AddedTeam[];
  editedTeams: EditedTeam[];
  deletedTeams: DeletedTeam[];
} => {
  const addedTeams: AddedTeam[] = [];
  const editedTeams: EditedTeam[] = [];
  const deletedTeams: DeletedTeam[] = [];

  inputTeams.forEach((team) => {
    const foundTeam = mappedTeams.find((t) => t.id === team.id);
    if (foundTeam) {
      if (foundTeam.name !== team.name) {
        editedTeams.push({ id: team.id, name: team.name });
      }
      return;
    }
    addedTeams.push({ id: team.id, name: team.name, roles: team.roles });
  });

  mappedTeams.forEach((team) => {
    const foundTeam = inputTeams.find((t) => t.id === team.id);
    if (!foundTeam) {
      deletedTeams.push({ id: team.id });
    }
  });

  return { addedTeams, editedTeams, deletedTeams };
};

// ─── TeamWithScoring ─────────────────────────────────────────────

export interface TeamWithScoring {
  id: number;
  teamId: number;
  placement: number | null;
  winner: boolean;
  score: number | null;
  rounds: { roundId: number; score: number | null }[];
}

// ─── buildOriginalTeams ──────────────────────────────────────────

/**
 * Build team-level scoring from individual match-player data.
 * When all players on a team share the same placement/score/winner
 * value, that value is promoted to the team level.
 */
export const buildOriginalTeams = (
  teams: { id: number }[],
  matchPlayers: {
    teamId: number | null;
    placement: number | null;
    score: number | null;
    winner: boolean | null;
    playerRounds: { roundId: number; score: number | null }[];
  }[],
): TeamWithScoring[] => {
  return teams.map((team) => {
    const teamPlayers = matchPlayers.filter((mp) => mp.teamId === team.id);
    if (teamPlayers.length === 0) {
      return {
        id: team.id,
        teamId: team.id,
        placement: null,
        winner: false,
        score: null,
        rounds: [],
      };
    }
    const placements = teamPlayers.map((p) => p.placement);
    const scores = teamPlayers.map((p) => p.score);
    const winners = teamPlayers.map((p) => p.winner);

    const allSamePlacement =
      placements.every((v) => v != null) && new Set(placements).size === 1;
    const allSameScore =
      scores.every((v) => v != null) && new Set(scores).size === 1;
    const allSameWinner = new Set(winners).size === 1;

    // Validate that playerRounds are identical across all team players
    const referenceRounds = teamPlayers[0]?.playerRounds ?? [];
    const roundsAreConsistent = teamPlayers.every((tp) => {
      if (tp.playerRounds.length !== referenceRounds.length) return false;
      return referenceRounds.every((ref) => {
        const matching = tp.playerRounds.find((r) => r.roundId === ref.roundId);
        if (!matching) return false;
        // Treat nulls explicitly: both null or both equal
        if (ref.score === null && matching.score === null) return true;
        return ref.score === matching.score;
      });
    });

    if (!roundsAreConsistent) {
      throw new Error(
        `Team ${team.id} has divergent per-round data across its players. ` +
          `Cannot determine a consensus for team rounds.`,
      );
    }

    return {
      id: team.id,
      teamId: team.id,
      placement: allSamePlacement ? (placements[0] ?? null) : null,
      winner: allSameWinner ? (winners[0] ?? false) : false,
      score: allSameScore ? (scores[0] ?? null) : null,
      rounds: referenceRounds,
    };
  });
};
