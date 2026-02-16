import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import {
  createAuthenticatedCaller,
  createFullMatch,
  createFullMatchWithTeams,
  matchTestLifecycle,
} from "./match-test-fixtures";

describe("Match Update - Structure (details, teams, roles)", () => {
  const testUserId = "test-user-match-structure";
  const lifecycle = matchTestLifecycle(testUserId);

  beforeAll(async () => {
    await lifecycle.deleteTestUser();
  });

  afterAll(async () => {
    await lifecycle.deleteTestUser();
  });

  beforeEach(async () => {
    await lifecycle.createTestUser();
  });

  afterEach(async () => {
    await lifecycle.deleteTestUser();
  });

  // ── updateMatchDetails (player) ────────────────────────────────────

  describe("updateMatchDetails (player)", () => {
    test("sets player details on a match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      const playersAndTeams = await caller.match.getMatchPlayersAndTeams({
        type: "original",
        id: match.id,
      });

      const firstPlayer = playersAndTeams.players[0];
      expect(firstPlayer).toBeDefined();
      if (!firstPlayer) return;

      await caller.match.update.updateMatchDetails({
        type: "player",
        id: firstPlayer.baseMatchPlayerId,
        match: { type: "original", id: match.id },
        details: "Played aggressively",
      });

      const updatedPlayersAndTeams = await caller.match.getMatchPlayersAndTeams(
        {
          type: "original",
          id: match.id,
        },
      );

      const updatedPlayer = updatedPlayersAndTeams.players.find(
        (p) => p.baseMatchPlayerId === firstPlayer.baseMatchPlayerId,
      );
      expect(updatedPlayer?.details).toBe("Played aggressively");
    });

    test("throws NOT_FOUND for non-existent match player", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      await expect(
        caller.match.update.updateMatchDetails({
          type: "player",
          id: 999999,
          match: { type: "original", id: match.id },
          details: "No player",
        }),
      ).rejects.toThrow();
    });

    test("throws NOT_FOUND for non-existent match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.match.update.updateMatchDetails({
          type: "player",
          id: 1,
          match: { type: "original", id: 999999 },
          details: "No match",
        }),
      ).rejects.toThrow();
    });
  });

  // ── updateMatchDetails (team) ──────────────────────────────────────

  describe("updateMatchDetails (team)", () => {
    test("sets team details on a match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatchWithTeams(caller);

      const playersAndTeams = await caller.match.getMatchPlayersAndTeams({
        type: "original",
        id: match.id,
      });

      const firstTeam = playersAndTeams.teams[0];
      expect(firstTeam).toBeDefined();
      if (!firstTeam) return;

      await caller.match.update.updateMatchDetails({
        type: "team",
        teamId: firstTeam.id,
        match: { type: "original", id: match.id },
        details: "Strong team play",
      });

      const updatedPlayersAndTeams = await caller.match.getMatchPlayersAndTeams(
        {
          type: "original",
          id: match.id,
        },
      );

      const updatedTeam = updatedPlayersAndTeams.teams.find(
        (t) => t.id === firstTeam.id,
      );
      expect(updatedTeam?.details).toBe("Strong team play");
    });

    test("throws NOT_FOUND for non-existent team", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      await expect(
        caller.match.update.updateMatchDetails({
          type: "team",
          teamId: 999999,
          match: { type: "original", id: match.id },
          details: "No team",
        }),
      ).rejects.toThrow();
    });
  });

  // ── updateMatchPlayerTeamAndRoles ──────────────────────────────────

  describe("updateMatchPlayerTeamAndRoles", () => {
    test("assigns a player to a team", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatchWithTeams(caller);

      const playersAndTeams = await caller.match.getMatchPlayersAndTeams({
        type: "original",
        id: match.id,
      });

      // Find a player in team 1 and the second team
      const team1 = playersAndTeams.teams[0];
      const team2 = playersAndTeams.teams[1];
      expect(team1).toBeDefined();
      expect(team2).toBeDefined();
      if (!team1 || !team2) return;

      const playerInTeam1 = playersAndTeams.players.find(
        (p) => p.teamId === team1.id,
      );
      expect(playerInTeam1).toBeDefined();
      if (!playerInTeam1) return;

      // Move player to team 2
      await caller.match.update.updateMatchPlayerTeamAndRoles({
        type: "original",
        id: playerInTeam1.baseMatchPlayerId,
        teamId: team2.id,
        rolesToAdd: [],
        rolesToRemove: [],
      });

      const updatedPlayersAndTeams = await caller.match.getMatchPlayersAndTeams(
        {
          type: "original",
          id: match.id,
        },
      );

      const movedPlayer = updatedPlayersAndTeams.players.find(
        (p) => p.baseMatchPlayerId === playerInTeam1.baseMatchPlayerId,
      );
      expect(movedPlayer?.teamId).toBe(team2.id);
    });

    test("removes a player from a team", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatchWithTeams(caller);

      const playersAndTeams = await caller.match.getMatchPlayersAndTeams({
        type: "original",
        id: match.id,
      });

      const playerWithTeam = playersAndTeams.players.find(
        (p) => p.teamId !== null,
      );
      expect(playerWithTeam).toBeDefined();
      if (!playerWithTeam) return;

      // Remove from team (set to null)
      await caller.match.update.updateMatchPlayerTeamAndRoles({
        type: "original",
        id: playerWithTeam.baseMatchPlayerId,
        teamId: null,
        rolesToAdd: [],
        rolesToRemove: [],
      });

      const updatedPlayersAndTeams = await caller.match.getMatchPlayersAndTeams(
        {
          type: "original",
          id: match.id,
        },
      );

      const updatedPlayer = updatedPlayersAndTeams.players.find(
        (p) => p.baseMatchPlayerId === playerWithTeam.baseMatchPlayerId,
      );
      expect(updatedPlayer?.teamId).toBeNull();
    });

    test("throws NOT_FOUND for non-existent match player", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.match.update.updateMatchPlayerTeamAndRoles({
          type: "original",
          id: 999999,
          rolesToAdd: [],
          rolesToRemove: [],
        }),
      ).rejects.toThrow();
    });
  });

  // ── updateMatchTeam ────────────────────────────────────────────────

  describe("updateMatchTeam", () => {
    test("renames a team", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatchWithTeams(caller);

      const playersAndTeams = await caller.match.getMatchPlayersAndTeams({
        type: "original",
        id: match.id,
      });

      const firstTeam = playersAndTeams.teams[0];
      expect(firstTeam).toBeDefined();
      if (!firstTeam) return;

      await caller.match.update.updateMatchTeam({
        type: "original",
        id: match.id,
        team: {
          id: firstTeam.id,
          name: "Renamed Team",
        },
        playersToAdd: [],
        playersToRemove: [],
        playersToUpdate: [],
      });

      const updatedPlayersAndTeams = await caller.match.getMatchPlayersAndTeams(
        {
          type: "original",
          id: match.id,
        },
      );

      const renamedTeam = updatedPlayersAndTeams.teams.find(
        (t) => t.id === firstTeam.id,
      );
      expect(renamedTeam?.name).toBe("Renamed Team");
    });

    test("adds a player to a team", { timeout: 15000 }, async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatchWithTeams(caller);

      const playersAndTeams = await caller.match.getMatchPlayersAndTeams({
        type: "original",
        id: match.id,
      });

      const team1 = playersAndTeams.teams[0];
      const team2 = playersAndTeams.teams[1];
      expect(team1).toBeDefined();
      expect(team2).toBeDefined();
      if (!team1 || !team2) return;

      // Find a player in team 2
      const playerInTeam2 = playersAndTeams.players.find(
        (p) => p.teamId === team2.id,
      );
      expect(playerInTeam2).toBeDefined();
      if (!playerInTeam2) return;

      // First remove from team 2 by moving to no team
      await caller.match.update.updateMatchPlayerTeamAndRoles({
        type: "original",
        id: playerInTeam2.baseMatchPlayerId,
        teamId: null,
        rolesToAdd: [],
        rolesToRemove: [],
      });

      // Then add to team 1 via updateMatchTeam
      await caller.match.update.updateMatchTeam({
        type: "original",
        id: match.id,
        team: { id: team1.id },
        playersToAdd: [
          {
            id: playerInTeam2.baseMatchPlayerId,
            roles: [],
          },
        ],
        playersToRemove: [],
        playersToUpdate: [],
      });

      const updatedPlayersAndTeams = await caller.match.getMatchPlayersAndTeams(
        {
          type: "original",
          id: match.id,
        },
      );

      const movedPlayer = updatedPlayersAndTeams.players.find(
        (p) => p.baseMatchPlayerId === playerInTeam2.baseMatchPlayerId,
      );
      expect(movedPlayer?.teamId).toBe(team1.id);
    });

    test("removes a player from a team via updateMatchTeam", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatchWithTeams(caller);

      const playersAndTeams = await caller.match.getMatchPlayersAndTeams({
        type: "original",
        id: match.id,
      });

      const team1 = playersAndTeams.teams[0];
      expect(team1).toBeDefined();
      if (!team1) return;

      const playerInTeam1 = playersAndTeams.players.find(
        (p) => p.teamId === team1.id,
      );
      expect(playerInTeam1).toBeDefined();
      if (!playerInTeam1) return;

      await caller.match.update.updateMatchTeam({
        type: "original",
        id: match.id,
        team: { id: team1.id },
        playersToAdd: [],
        playersToRemove: [
          {
            id: playerInTeam1.baseMatchPlayerId,
            roles: [],
          },
        ],
        playersToUpdate: [],
      });

      const updatedPlayersAndTeams = await caller.match.getMatchPlayersAndTeams(
        {
          type: "original",
          id: match.id,
        },
      );

      const removedPlayer = updatedPlayersAndTeams.players.find(
        (p) => p.baseMatchPlayerId === playerInTeam1.baseMatchPlayerId,
      );
      expect(removedPlayer?.teamId).toBeNull();
    });

    test("throws NOT_FOUND for non-existent team", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      await expect(
        caller.match.update.updateMatchTeam({
          type: "original",
          id: match.id,
          team: { id: 999999 },
          playersToAdd: [],
          playersToRemove: [],
          playersToUpdate: [],
        }),
      ).rejects.toThrow();
    });

    test("throws NOT_FOUND for non-existent match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.match.update.updateMatchTeam({
          type: "original",
          id: 999999,
          team: { id: 1 },
          playersToAdd: [],
          playersToRemove: [],
          playersToUpdate: [],
        }),
      ).rejects.toThrow();
    });
  });
});
