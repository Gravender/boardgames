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
  matchTestLifecycle,
} from "./match-test-fixtures";

describe("Match Update - Scores, Winners, Placements, Final Scores", () => {
  const testUserId = "test-user-match-scores";
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

  // ── updateMatchRoundScore ──────────────────────────────────────────

  describe("updateMatchRoundScore", () => {
    test("updates a player round score", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      // Get players and their rounds
      const playersAndTeams = await caller.match.getMatchPlayersAndTeams({
        type: "original",
        id: match.id,
      });

      const firstPlayer = playersAndTeams.players[0];
      expect(firstPlayer).toBeDefined();
      if (!firstPlayer) return;

      const firstRound = firstPlayer.rounds[0];
      expect(firstRound).toBeDefined();
      if (!firstRound) return;

      await caller.match.update.updateMatchRoundScore({
        type: "player",
        match: { type: "original", id: match.id },
        matchPlayerId: firstPlayer.baseMatchPlayerId,
        round: {
          id: firstRound.roundId,
          score: 42,
        },
      });

      // Verify the score was updated
      const updatedPlayersAndTeams = await caller.match.getMatchPlayersAndTeams(
        {
          type: "original",
          id: match.id,
        },
      );

      const updatedPlayer = updatedPlayersAndTeams.players.find(
        (p) => p.baseMatchPlayerId === firstPlayer.baseMatchPlayerId,
      );
      expect(updatedPlayer).toBeDefined();
      const updatedRound = updatedPlayer?.rounds.find(
        (r) => r.roundId === firstRound.roundId,
      );
      expect(updatedRound?.score).toBe(42);
    });

    test("throws NOT_FOUND for non-existent match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.match.update.updateMatchRoundScore({
          type: "player",
          match: { type: "original", id: 999999 },
          matchPlayerId: 1,
          round: { id: 1, score: 10 },
        }),
      ).rejects.toThrow();
    });

    test("throws NOT_FOUND for non-existent match player", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      await expect(
        caller.match.update.updateMatchRoundScore({
          type: "player",
          match: { type: "original", id: match.id },
          matchPlayerId: 999999,
          round: { id: 1, score: 10 },
        }),
      ).rejects.toThrow();
    });
  });

  // ── updateMatchPlayerScore ─────────────────────────────────────────

  describe("updateMatchPlayerScore", () => {
    test("updates a player overall score", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      const playersAndTeams = await caller.match.getMatchPlayersAndTeams({
        type: "original",
        id: match.id,
      });

      const firstPlayer = playersAndTeams.players[0];
      expect(firstPlayer).toBeDefined();
      if (!firstPlayer) return;

      await caller.match.update.updateMatchPlayerScore({
        type: "player",
        match: { type: "original", id: match.id },
        matchPlayerId: firstPlayer.baseMatchPlayerId,
        score: 100,
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
      expect(updatedPlayer?.score).toBe(100);
    });

    test("sets score to null", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      const playersAndTeams = await caller.match.getMatchPlayersAndTeams({
        type: "original",
        id: match.id,
      });

      const firstPlayer = playersAndTeams.players[0];
      expect(firstPlayer).toBeDefined();
      if (!firstPlayer) return;

      // Set score first
      await caller.match.update.updateMatchPlayerScore({
        type: "player",
        match: { type: "original", id: match.id },
        matchPlayerId: firstPlayer.baseMatchPlayerId,
        score: 50,
      });

      // Reset to null
      await caller.match.update.updateMatchPlayerScore({
        type: "player",
        match: { type: "original", id: match.id },
        matchPlayerId: firstPlayer.baseMatchPlayerId,
        score: null,
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
      expect(updatedPlayer?.score).toBeNull();
    });

    test("throws NOT_FOUND for non-existent match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.match.update.updateMatchPlayerScore({
          type: "player",
          match: { type: "original", id: 999999 },
          matchPlayerId: 1,
          score: 10,
        }),
      ).rejects.toThrow();
    });
  });

  // ── updateMatchFinalScores ─────────────────────────────────────────

  describe("updateMatchFinalScores", () => {
    test("calculates and sets final scores for a match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      // Set some round scores first
      const playersAndTeams = await caller.match.getMatchPlayersAndTeams({
        type: "original",
        id: match.id,
      });

      let scoreCounter = 10;
      for (const player of playersAndTeams.players) {
        for (const round of player.rounds) {
          scoreCounter += 5;
          await caller.match.update.updateMatchRoundScore({
            type: "player",
            match: { type: "original", id: match.id },
            matchPlayerId: player.baseMatchPlayerId,
            round: {
              id: round.roundId,
              score: scoreCounter,
            },
          });
        }
      }

      // Calculate final scores
      await caller.match.update.updateMatchFinalScores({
        type: "original",
        id: match.id,
      });

      // Verify scores were calculated
      const updatedPlayersAndTeams = await caller.match.getMatchPlayersAndTeams(
        {
          type: "original",
          id: match.id,
        },
      );

      // At least one player should have a non-null score after final calculation
      const hasScores = updatedPlayersAndTeams.players.some(
        (p) => p.score !== null,
      );
      expect(hasScores).toBe(true);
    });

    test("throws NOT_FOUND for non-existent match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.match.update.updateMatchFinalScores({
          type: "original",
          id: 999999,
        }),
      ).rejects.toThrow();
    });
  });

  // ── updateMatchManualWinner ────────────────────────────────────────

  describe("updateMatchManualWinner", () => {
    test("sets a manual winner", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      const playersAndTeams = await caller.match.getMatchPlayersAndTeams({
        type: "original",
        id: match.id,
      });

      const firstPlayer = playersAndTeams.players[0];
      expect(firstPlayer).toBeDefined();
      if (!firstPlayer) return;

      await caller.match.update.updateMatchManualWinner({
        match: { type: "original", id: match.id },
        winners: [{ id: firstPlayer.baseMatchPlayerId }],
      });

      // Verify the match is now finished
      const updatedMatch = await caller.match.getMatch({
        type: "original",
        id: match.id,
      });
      expect(updatedMatch.finished).toBe(true);

      // Verify the winner is set
      const updatedPlayersAndTeams = await caller.match.getMatchPlayersAndTeams(
        {
          type: "original",
          id: match.id,
        },
      );

      const winner = updatedPlayersAndTeams.players.find(
        (p) => p.baseMatchPlayerId === firstPlayer.baseMatchPlayerId,
      );
      expect(winner?.winner).toBe(true);

      // Other players should not be winners
      const losers = updatedPlayersAndTeams.players.filter(
        (p) => p.baseMatchPlayerId !== firstPlayer.baseMatchPlayerId,
      );
      for (const loser of losers) {
        expect(loser.winner).toBe(false);
      }
    });

    test("sets multiple winners", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller, { playerCount: 3 });

      const playersAndTeams = await caller.match.getMatchPlayersAndTeams({
        type: "original",
        id: match.id,
      });

      // Set two winners
      const winners = playersAndTeams.players.slice(0, 2);
      await caller.match.update.updateMatchManualWinner({
        match: { type: "original", id: match.id },
        winners: winners.map((w) => ({ id: w.baseMatchPlayerId })),
      });

      const updatedPlayersAndTeams = await caller.match.getMatchPlayersAndTeams(
        {
          type: "original",
          id: match.id,
        },
      );

      const winnerIds = winners.map((w) => w.baseMatchPlayerId);
      for (const player of updatedPlayersAndTeams.players) {
        if (winnerIds.includes(player.baseMatchPlayerId)) {
          expect(player.winner).toBe(true);
        } else {
          expect(player.winner).toBe(false);
        }
      }
    });

    test("throws NOT_FOUND for non-existent match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.match.update.updateMatchManualWinner({
          match: { type: "original", id: 999999 },
          winners: [{ id: 1 }],
        }),
      ).rejects.toThrow();
    });
  });

  // ── updateMatchPlacements ──────────────────────────────────────────

  describe("updateMatchPlacements", () => {
    test("sets placements for players", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller, { playerCount: 3 });

      const playersAndTeams = await caller.match.getMatchPlayersAndTeams({
        type: "original",
        id: match.id,
      });

      const placements = playersAndTeams.players.map((p, index) => ({
        id: p.baseMatchPlayerId,
        placement: index + 1,
      }));

      await caller.match.update.updateMatchPlacements({
        match: { type: "original", id: match.id },
        playersPlacement: placements,
      });

      // Verify the match is now finished
      const updatedMatch = await caller.match.getMatch({
        type: "original",
        id: match.id,
      });
      expect(updatedMatch.finished).toBe(true);

      // Verify placements were set
      const updatedPlayersAndTeams = await caller.match.getMatchPlayersAndTeams(
        {
          type: "original",
          id: match.id,
        },
      );

      for (const placement of placements) {
        const player = updatedPlayersAndTeams.players.find(
          (p) => p.baseMatchPlayerId === placement.id,
        );
        expect(player?.placement).toBe(placement.placement);
      }

      // First placement should be the winner
      const firstPlace = updatedPlayersAndTeams.players.find(
        (p) => p.placement === 1,
      );
      expect(firstPlace?.winner).toBe(true);
    });

    test("throws NOT_FOUND for non-existent match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.match.update.updateMatchPlacements({
          match: { type: "original", id: 999999 },
          playersPlacement: [{ id: 1, placement: 1 }],
        }),
      ).rejects.toThrow();
    });
  });
});
