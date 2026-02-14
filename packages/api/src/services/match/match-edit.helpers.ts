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
    const roleCount: { id: number; count: number }[] = [];
    teamPlayers.forEach((player) => {
      player.roles.forEach((role) => {
        const existingRole = roleCount.find((r) => r.id === role.id);
        if (existingRole) {
          existingRole.count++;
        } else {
          roleCount.push({ id: role.id, count: 1 });
        }
      });
    });
    const teamRoles = roleCount
      .filter((role) => role.count === teamPlayers.length)
      .map((r) => ({ id: r.id, type: "original" as const }));
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
      const playerRoles: MatchRoleRef[] = [...player.roles];
      const teamRoles =
        inputTeams.find((t) => t.id === player.teamId)?.roles ?? [];
      teamRoles.forEach((role) => {
        const foundRole = playerRoles.find((r) => isSameRole(r, role));
        if (!foundRole) {
          playerRoles.push(role);
        }
      });
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
      const playerRoles: MatchRoleRef[] = [...player.roles];
      const teamRoles =
        inputTeams.find((t) => t.id === player.teamId)?.roles ?? [];
      teamRoles.forEach((role) => {
        const foundRole = playerRoles.find((r) => isSameRole(r, role));
        if (!foundRole) {
          playerRoles.push(role);
        }
      });
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
