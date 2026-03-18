import { TRPCError } from "@trpc/server";
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

import { db } from "@board-games/db/client";
import {
  game,
  match,
  matchPlayer,
  scoresheet,
  sharedGame,
  sharedMatch,
  sharedMatchPlayer,
  sharedPlayer,
  sharedScoresheet,
} from "@board-games/db/schema";

import type { AppRouter } from "../../root";
import { createContextInner } from "../../context";
import { appRouter } from "../../root";
import {
  createTestSession,
  createTestUser,
  deleteTestUser,
} from "../../test-helpers";
import { createCallerFactory } from "../../trpc";

const ownerUserId = "test-user-player-read-owner";
const viewerUserId = "test-user-player-read-viewer";
const strangerUserId = "test-user-player-read-stranger";

const createCaller = async (userId: string) => {
  const ctx = await createContextInner({
    session: createTestSession(userId),
  });
  return createCallerFactory(appRouter)(ctx);
};

const seedPlayerReadData = async () => {
  const ownerCaller = await createCaller(ownerUserId);

  const createdPlayer = await ownerCaller.player.create({
    name: "Owner Player",
    imageId: null,
  });

  const createdGame = (
    await db
      .insert(game)
      .values({
        name: "Migration Test Game",
        createdBy: ownerUserId,
      })
      .returning()
  )[0]!;

  const createdScoresheet = (
    await db
      .insert(scoresheet)
      .values({
        name: "Migration Test Scoresheet",
        gameId: createdGame.id,
        createdBy: ownerUserId,
        isCoop: false,
        winCondition: "Highest Score",
        roundsScore: "Aggregate",
        targetScore: 0,
        type: "Default",
      })
      .returning()
  )[0]!;

  const createdMatch = (
    await db
      .insert(match)
      .values({
        name: "Migration Test Match",
        createdBy: ownerUserId,
        gameId: createdGame.id,
        scoresheetId: createdScoresheet.id,
        finished: true,
        running: false,
        duration: 45,
      })
      .returning()
  )[0]!;

  const createdMatchPlayer = (
    await db
      .insert(matchPlayer)
      .values({
        matchId: createdMatch.id,
        playerId: createdPlayer.id,
        winner: true,
        score: 10,
        placement: 1,
      })
      .returning()
  )[0]!;

  const createdSharedPlayer = (
    await db
      .insert(sharedPlayer)
      .values({
        ownerId: ownerUserId,
        sharedWithId: viewerUserId,
        playerId: createdPlayer.id,
        permission: "view",
      })
      .returning()
  )[0]!;

  const createdSharedGame = (
    await db
      .insert(sharedGame)
      .values({
        ownerId: ownerUserId,
        sharedWithId: viewerUserId,
        gameId: createdGame.id,
        permission: "view",
      })
      .returning()
  )[0]!;

  const createdSharedScoresheet = (
    await db
      .insert(sharedScoresheet)
      .values({
        ownerId: ownerUserId,
        sharedWithId: viewerUserId,
        scoresheetId: createdScoresheet.id,
        sharedGameId: createdSharedGame.id,
        type: "game",
        isDefault: true,
        permission: "view",
      })
      .returning()
  )[0]!;

  const createdSharedMatch = (
    await db
      .insert(sharedMatch)
      .values({
        ownerId: ownerUserId,
        sharedWithId: viewerUserId,
        matchId: createdMatch.id,
        sharedGameId: createdSharedGame.id,
        sharedScoresheetId: createdSharedScoresheet.id,
        permission: "view",
      })
      .returning()
  )[0]!;

  await db.insert(sharedMatchPlayer).values({
    ownerId: ownerUserId,
    sharedWithId: viewerUserId,
    matchPlayerId: createdMatchPlayer.id,
    sharedMatchId: createdSharedMatch.id,
    sharedPlayerId: createdSharedPlayer.id,
    permission: "view",
  });

  return {
    originalPlayerId: createdPlayer.id,
    originalGameId: createdGame.id,
    sharedPlayerId: createdSharedPlayer.id,
    sharedGameId: createdSharedGame.id,
  };
};

describe("Player Read Migration", () => {
  beforeAll(async () => {
    await deleteTestUser(ownerUserId);
    await deleteTestUser(viewerUserId);
    await deleteTestUser(strangerUserId);
  });

  afterAll(async () => {
    await deleteTestUser(ownerUserId);
    await deleteTestUser(viewerUserId);
    await deleteTestUser(strangerUserId);
  });

  beforeEach(async () => {
    await createTestUser(ownerUserId);
    await createTestUser(viewerUserId);
    await createTestUser(strangerUserId);
  });

  afterEach(async () => {
    await deleteTestUser(ownerUserId);
    await deleteTestUser(viewerUserId);
    await deleteTestUser(strangerUserId);
  });

  test("getPlayers includes original and shared players", async () => {
    await seedPlayerReadData();
    const ownerCaller = await createCaller(ownerUserId);
    const viewerCaller = await createCaller(viewerUserId);

    const ownerPlayers = await ownerCaller.newPlayer.getPlayers();
    const viewerPlayers = await viewerCaller.newPlayer.getPlayers();

    expect(ownerPlayers.some((p) => p.type === "original")).toBe(true);
    expect(ownerPlayers.every((p) => p.permissions === "edit")).toBe(true);

    const sharedEntry = viewerPlayers.find((p) => p.type === "shared");
    expect(sharedEntry).toBeDefined();
    expect(sharedEntry?.permissions).toBe("view");
  });

  test("getPlayersByGame supports original and shared branches", async () => {
    const seeded = await seedPlayerReadData();
    const viewerCaller = await createCaller(viewerUserId);

    const getPlayersByGameInput: inferProcedureInput<
      AppRouter["newPlayer"]["getPlayersByGame"]
    > = {
      sharedId: seeded.sharedGameId,
      type: "shared",
    };
    const sharedBranch = await viewerCaller.newPlayer.getPlayersByGame(
      getPlayersByGameInput,
    );
    const originalBranch = await viewerCaller.newPlayer.getPlayersByGame({
      id: seeded.originalGameId,
      type: "original",
    });

    expect(sharedBranch.some((p) => p.type === "shared")).toBe(true);
    expect(
      sharedBranch.find((p) => p.type === "shared")?.matches,
    ).toBeGreaterThan(0);
    expect(originalBranch.some((p) => p.type === "original")).toBe(true);
  });

  test("getPlayer returns discriminated original and shared entities", async () => {
    const seeded = await seedPlayerReadData();
    const ownerCaller = await createCaller(ownerUserId);
    const viewerCaller = await createCaller(viewerUserId);

    const original = await ownerCaller.newPlayer.getPlayer({
      id: seeded.originalPlayerId,
      type: "original",
    });
    const shared = await viewerCaller.newPlayer.getPlayer({
      sharedId: seeded.sharedPlayerId,
      type: "shared",
    });

    expect(original.type).toBe("original");
    expect(original.permissions).toBe("edit");
    expect(original.stats.plays).toBeGreaterThan(0);

    expect(shared.type).toBe("shared");
    expect(shared.permissions).toBe("view");
    expect(shared.stats.plays).toBeGreaterThan(0);
  });

  test("getPlayer enforces authorization for original and shared records", async () => {
    const seeded = await seedPlayerReadData();
    const strangerCaller = await createCaller(strangerUserId);

    await expect(
      strangerCaller.newPlayer.getPlayer({
        id: seeded.originalPlayerId,
        type: "original",
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    } satisfies Partial<TRPCError>);

    await expect(
      strangerCaller.newPlayer.getPlayer({
        sharedId: seeded.sharedPlayerId,
        type: "shared",
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    } satisfies Partial<TRPCError>);
  });
});
