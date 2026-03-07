import { describe, expect, it } from "vitest";

import { updatePlayersForTeams } from "./update-players-for-teams";

interface Role {
  id: number;
  name: string;
}
interface Team {
  id: number;
  name: string;
  roles: Role[];
}
interface Player {
  id: number;
  name: string;
  teamId: number | null;
  roles: Role[];
}

const isSameRole = (a: Role, b: Role) => a.id === b.id;

describe("updatePlayersForTeams", () => {
  it("removes role no longer provided by team", () => {
    const players: Player[] = [
      {
        id: 1,
        name: "Alice",
        teamId: 10,
        roles: [
          { id: 1, name: "Leader" },
          { id: 2, name: "Support" },
        ],
      },
    ];
    const currentTeams: Team[] = [
      {
        id: 10,
        name: "Red",
        roles: [
          { id: 1, name: "Leader" },
          { id: 2, name: "Support" },
        ],
      },
    ];
    const newTeams: Team[] = [
      {
        id: 10,
        name: "Red",
        roles: [{ id: 1, name: "Leader" }],
      },
    ];

    const mappedPlayers = updatePlayersForTeams({
      players,
      currentTeams,
      newTeams,
      isSameRole,
    });

    expect(mappedPlayers[0]?.roles).toEqual([{ id: 1, name: "Leader" }]);
  });

  it("adds missing team role to player", () => {
    const players: Player[] = [
      {
        id: 1,
        name: "Alice",
        teamId: 10,
        roles: [{ id: 1, name: "Leader" }],
      },
    ];
    const currentTeams: Team[] = [
      {
        id: 10,
        name: "Red",
        roles: [{ id: 1, name: "Leader" }],
      },
    ];
    const newTeams: Team[] = [
      {
        id: 10,
        name: "Red",
        roles: [
          { id: 1, name: "Leader" },
          { id: 3, name: "Scout" },
        ],
      },
    ];

    const mappedPlayers = updatePlayersForTeams({
      players,
      currentTeams,
      newTeams,
      isSameRole,
    });

    expect(mappedPlayers[0]?.roles).toEqual([
      { id: 1, name: "Leader" },
      { id: 3, name: "Scout" },
    ]);
  });

  it("clears teamId and removes prior team roles when team is deleted", () => {
    const players: Player[] = [
      {
        id: 1,
        name: "Alice",
        teamId: 10,
        roles: [
          { id: 1, name: "Leader" },
          { id: 99, name: "PersonalRole" },
        ],
      },
    ];
    const currentTeams: Team[] = [
      {
        id: 10,
        name: "Red",
        roles: [{ id: 1, name: "Leader" }],
      },
    ];
    const newTeams: Team[] = [];

    const mappedPlayers = updatePlayersForTeams({
      players,
      currentTeams,
      newTeams,
      isSameRole,
    });

    expect(mappedPlayers[0]).toEqual({
      id: 1,
      name: "Alice",
      teamId: null,
      roles: [{ id: 99, name: "PersonalRole" }],
    });
  });

  it("merges roles when player belongs to newly created team", () => {
    const players: Player[] = [
      {
        id: 1,
        name: "Alice",
        teamId: 20,
        roles: [{ id: 99, name: "PersonalRole" }],
      },
    ];
    const currentTeams: Team[] = [
      {
        id: 10,
        name: "Red",
        roles: [{ id: 1, name: "Leader" }],
      },
    ];
    const newTeams: Team[] = [
      {
        id: 10,
        name: "Red",
        roles: [{ id: 1, name: "Leader" }],
      },
      {
        id: 20,
        name: "Blue",
        roles: [
          { id: 2, name: "Scout" },
          { id: 3, name: "Support" },
          { id: 99, name: "PersonalRole" },
        ],
      },
    ];

    const mappedPlayers = updatePlayersForTeams({
      players,
      currentTeams,
      newTeams,
      isSameRole,
    });

    expect(mappedPlayers[0]).toEqual({
      id: 1,
      name: "Alice",
      teamId: 20,
      roles: [
        { id: 99, name: "PersonalRole" },
        { id: 2, name: "Scout" },
        { id: 3, name: "Support" },
      ],
    });
  });

  it("updates all players assigned to the same team", () => {
    const players: Player[] = [
      {
        id: 1,
        name: "Alice",
        teamId: 10,
        roles: [{ id: 1, name: "Leader" }],
      },
      {
        id: 2,
        name: "Bob",
        teamId: 10,
        roles: [
          { id: 1, name: "Leader" },
          { id: 4, name: "PersonalRole" },
        ],
      },
    ];
    const currentTeams: Team[] = [
      {
        id: 10,
        name: "Red",
        roles: [{ id: 1, name: "Leader" }],
      },
    ];
    const newTeams: Team[] = [
      {
        id: 10,
        name: "Red",
        roles: [{ id: 3, name: "Scout" }],
      },
    ];

    const mappedPlayers = updatePlayersForTeams({
      players,
      currentTeams,
      newTeams,
      isSameRole,
    });

    const aliceRoleIds =
      mappedPlayers[0]?.roles.map((role) => role.id).toSorted() ?? [];
    const bobRoleIds =
      mappedPlayers[1]?.roles.map((role) => role.id).toSorted() ?? [];

    expect(aliceRoleIds).toEqual([3]);
    expect(
      mappedPlayers[1]?.roles.some((role) =>
        isSameRole(role, { id: 4, name: "PersonalRole" }),
      ),
    ).toBe(true);
    expect(bobRoleIds).toEqual([3, 4]);
  });

  it("returns empty array for empty players input", () => {
    const mappedPlayers = updatePlayersForTeams({
      players: [],
      currentTeams: [
        { id: 10, name: "Red", roles: [{ id: 1, name: "Leader" }] },
      ],
      newTeams: [{ id: 10, name: "Red", roles: [{ id: 2, name: "Scout" }] }],
      isSameRole,
    });

    expect(mappedPlayers).toEqual([]);
  });

  it("updates teamId and roles when moving player to another existing team", () => {
    const players: Player[] = [
      {
        id: 1,
        name: "Alice",
        teamId: 20,
        roles: [
          { id: 1, name: "Leader" },
          { id: 5, name: "PersonalRole" },
        ],
      },
    ];
    const currentTeams: Team[] = [
      {
        id: 10,
        name: "Red",
        roles: [{ id: 1, name: "Leader" }],
      },
      {
        id: 20,
        name: "Blue",
        roles: [{ id: 1, name: "Leader" }],
      },
    ];
    const newTeams: Team[] = [
      {
        id: 10,
        name: "Red",
        roles: [{ id: 3, name: "Support" }],
      },
      {
        id: 20,
        name: "Blue",
        roles: [{ id: 1, name: "Leader" }],
      },
    ];

    const firstPlayer = players[0];
    if (!firstPlayer) {
      throw new Error("First player not found");
    }
    const playerSwitchedTeams: Player[] = [{ ...firstPlayer, teamId: 10 }];
    const mappedPlayers = updatePlayersForTeams({
      players: playerSwitchedTeams,
      currentTeams,
      newTeams,
      isSameRole,
    });

    expect(mappedPlayers[0]?.teamId).toBe(10);
    expect(
      mappedPlayers[0]?.roles.some((role) =>
        isSameRole(role, { id: 1, name: "Leader" }),
      ),
    ).toBe(false);
    expect(
      mappedPlayers[0]?.roles.some((role) =>
        isSameRole(role, { id: 3, name: "Support" }),
      ),
    ).toBe(true);
    expect(
      mappedPlayers[0]?.roles.some((role) =>
        isSameRole(role, { id: 5, name: "PersonalRole" }),
      ),
    ).toBe(true);
  });
});
