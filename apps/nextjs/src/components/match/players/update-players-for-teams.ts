export interface TeamLike<TRole> {
  id: number;
  roles: TRole[];
}

export interface PlayerLike<TRole> {
  teamId: number | null;
  roles: TRole[];
}

export type IsSameRoleFn<TRole> = (a: TRole, b: TRole) => boolean;

export const updatePlayersForTeams = <
  TRole,
  TPlayer extends PlayerLike<TRole>,
  TTeam extends TeamLike<TRole>,
>({
  players,
  currentTeams,
  newTeams,
  isSameRole,
}: {
  players: TPlayer[];
  currentTeams: TTeam[];
  newTeams: TTeam[];
  isSameRole: IsSameRoleFn<TRole>;
}): TPlayer[] => {
  return players.map((player) => {
    const foundTeam = newTeams.find((team) => team.id === player.teamId);
    const originalTeam = currentTeams.find((team) => team.id === player.teamId);

    if (!originalTeam && !foundTeam) {
      return player;
    }

    if (!foundTeam && originalTeam) {
      const filteredRoles = player.roles.filter(
        (role) =>
          !originalTeam.roles.find((existing) => isSameRole(existing, role)),
      );

      return {
        ...player,
        teamId: null,
        roles: filteredRoles,
      };
    }

    if (!foundTeam) {
      return player;
    }

    const rolesToRemove = originalTeam?.roles.filter(
      (role) => !foundTeam.roles.find((existing) => isSameRole(existing, role)),
    );

    const playerRoles = player.roles.filter(
      (role) => !rolesToRemove?.find((existing) => isSameRole(existing, role)),
    );
    const rolesToAdd = foundTeam.roles.filter(
      (role) => !playerRoles.find((existing) => isSameRole(existing, role)),
    );

    return {
      ...player,
      teamId: foundTeam.id,
      roles: [...playerRoles, ...rolesToAdd],
    };
  });
};
