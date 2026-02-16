import type { inferProcedureInput } from "@trpc/server";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import type { AppRouter } from "../../root";
import {
  createAuthenticatedCaller,
  createGameWithScoresheet,
  matchTestLifecycle,
} from "./match-test-fixtures";

describe("Match Create - Error Tests", () => {
  const testUserId = "test-user-1-match-errors";
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

  describe("error cases", () => {
    test("fails with missing required name", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId, scoresheetId } = await createGameWithScoresheet(caller);

      const player = await caller.player.create({
        name: "Test Player",
        imageId: null,
      });

      const input = {
        date: new Date(),
        game: { type: "original" as const, id: gameId },
        scoresheet: { type: "original" as const, id: scoresheetId },
        players: [
          {
            type: "original" as const,
            id: player.id,
            roles: [],
            teamId: null,
          },
        ],
        teams: [],
        location: null,
      } as unknown as inferProcedureInput<AppRouter["match"]["createMatch"]>;

      await expect(caller.match.createMatch(input)).rejects.toThrow();
    });

    test("fails with missing required date", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId, scoresheetId } = await createGameWithScoresheet(caller);

      const player = await caller.player.create({
        name: "Test Player",
        imageId: null,
      });

      const input = {
        name: "Test Match",
        game: { type: "original" as const, id: gameId },
        scoresheet: { type: "original" as const, id: scoresheetId },
        players: [
          {
            type: "original" as const,
            id: player.id,
            roles: [],
            teamId: null,
          },
        ],
        teams: [],
        location: null,
      } as unknown as inferProcedureInput<AppRouter["match"]["createMatch"]>;

      await expect(caller.match.createMatch(input)).rejects.toThrow();
    });

    test("fails with missing required game", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { scoresheetId } = await createGameWithScoresheet(caller);

      const player = await caller.player.create({
        name: "Test Player",
        imageId: null,
      });

      const input = {
        name: "Test Match",
        date: new Date(),
        scoresheet: { type: "original" as const, id: scoresheetId },
        players: [
          {
            type: "original" as const,
            id: player.id,
            roles: [],
            teamId: null,
          },
        ],
        teams: [],
        location: null,
      } as unknown as inferProcedureInput<AppRouter["match"]["createMatch"]>;

      await expect(caller.match.createMatch(input)).rejects.toThrow();
    });

    test("fails with missing required scoresheet", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(caller);

      const player = await caller.player.create({
        name: "Test Player",
        imageId: null,
      });

      const input = {
        name: "Test Match",
        date: new Date(),
        game: { type: "original" as const, id: gameId },
        players: [
          {
            type: "original" as const,
            id: player.id,
            roles: [],
            teamId: null,
          },
        ],
        teams: [],
        location: null,
      } as unknown as inferProcedureInput<AppRouter["match"]["createMatch"]>;

      await expect(caller.match.createMatch(input)).rejects.toThrow();
    });

    test("fails with missing required players", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId, scoresheetId } = await createGameWithScoresheet(caller);

      const input = {
        name: "Test Match",
        date: new Date(),
        game: { type: "original" as const, id: gameId },
        scoresheet: { type: "original" as const, id: scoresheetId },
        teams: [],
        location: null,
      } as unknown as inferProcedureInput<AppRouter["match"]["createMatch"]>;

      await expect(caller.match.createMatch(input)).rejects.toThrow();
    });
  });
});
