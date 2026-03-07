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
});
