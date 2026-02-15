import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";
import type {
  roundTypes,
  scoreSheetRoundsScore,
  scoreSheetTypes,
  scoreSheetWinConditions,
} from "@board-games/db/constants";
import { db } from "@board-games/db/client";

import type { GetGameInputType } from "../../routers/game/game.input";
import type {
  GetGameScoresheetsOutputType,
  GetGameScoreSheetsWithRoundsOutputType,
} from "../../routers/game/game.output";
import type {
  GetGameScoresheetsArgs,
  GetGameScoreSheetsWithRoundsArgs,
} from "./game.service.types";
import { gameRepository } from "../../repositories/game/game.repository";
import { scoresheetRepository } from "../../repositories/scoresheet/scoresheet.repository";

// ─── Type aliases derived from DB schema enums ───────────────

type WinCondition = (typeof scoreSheetWinConditions)[number];
type RoundsScore = (typeof scoreSheetRoundsScore)[number];
type ScoresheetType = (typeof scoreSheetTypes)[number];
type RoundType = (typeof roundTypes)[number];

// ─── Helpers ─────────────────────────────────────────────────

const scoresheetSortComparator = (
  a: { isDefault: boolean; name: string },
  b: { isDefault: boolean; name: string },
): number => {
  if (a.isDefault && !b.isDefault) return -1;
  if (!a.isDefault && b.isDefault) return 1;
  return a.name.localeCompare(b.name);
};

const mapOriginalScoresheetBase = (scoresheet: {
  id: number;
  name: string;
  type: ScoresheetType;
  winCondition: WinCondition;
  isCoop: boolean;
  roundsScore: RoundsScore;
  targetScore: number;
}) => ({
  id: scoresheet.id,
  name: scoresheet.name,
  type: "original" as const,
  isDefault: scoresheet.type === "Default",
  winCondition: scoresheet.winCondition,
  isCoop: scoresheet.isCoop,
  roundsScore: scoresheet.roundsScore,
  targetScore: scoresheet.targetScore,
});

const mapSharedScoresheetBase = (sharedScoresheet: {
  id: number;
  permission: "view" | "edit";
  isDefault: boolean;
  scoresheet: {
    name: string;
    winCondition: WinCondition;
    isCoop: boolean;
    roundsScore: RoundsScore;
    targetScore: number;
  };
}) => ({
  sharedId: sharedScoresheet.id,
  name: sharedScoresheet.scoresheet.name,
  type: "shared" as const,
  permission: sharedScoresheet.permission,
  isDefault: sharedScoresheet.isDefault,
  winCondition: sharedScoresheet.scoresheet.winCondition,
  isCoop: sharedScoresheet.scoresheet.isCoop,
  roundsScore: sharedScoresheet.scoresheet.roundsScore,
  targetScore: sharedScoresheet.scoresheet.targetScore,
});

const mapRound = (round: {
  id: number;
  name: string;
  type: RoundType;
  order: number;
  score: number;
  color: string | null;
  lookup: number | null;
  modifier: number | null;
}) => ({
  id: round.id,
  name: round.name,
  type: round.type,
  order: round.order,
  score: round.score,
  color: round.color,
  lookup: round.lookup,
  modifier: round.modifier,
});

const resolveOriginalGame = async (
  input: { id: number },
  ctx: { userId: string },
  tx: TransactionType,
) => {
  const returnedGame = await gameRepository.getGame(
    {
      id: input.id,
      createdBy: ctx.userId,
      with: {
        linkedGames: {
          where: {
            sharedWithId: ctx.userId,
          },
        },
      },
    },
    tx,
  );
  if (!returnedGame) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Game not found.",
    });
  }
  return returnedGame;
};

const resolveSharedGame = async (
  input: { sharedGameId: number },
  ctx: { userId: string },
  tx: TransactionType,
) => {
  const returnedSharedGame = await gameRepository.getSharedGame(
    {
      id: input.sharedGameId,
      sharedWithId: ctx.userId,
    },
    tx,
  );
  if (!returnedSharedGame) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Shared game not found.",
    });
  }
  return returnedSharedGame;
};

// ─── Resolved game context ───────────────────────────────────

type ResolvedGameContext =
  | { type: "original"; gameId: number; linkedGameIds: number[] }
  | { type: "shared"; sharedGameId: number };

// ─── Service ─────────────────────────────────────────────────

class GameScoresheetService {
  public async getGameScoresheets(
    args: GetGameScoresheetsArgs,
  ): Promise<GetGameScoresheetsOutputType> {
    return this.withGameContext(args, async (context, userId, tx) => {
      if (context.type === "original") {
        const originalScoresheets = await scoresheetRepository.getAll(
          { createdBy: userId, gameId: context.gameId },
          tx,
        );
        const sharedScoresheets = await scoresheetRepository.getAllShared(
          {
            sharedWithId: userId,
            where: {
              linkedScoresheetId: { isNull: true },
              sharedGameId: { in: context.linkedGameIds },
            },
            with: { scoresheet: true },
          },
          tx,
        );
        return [
          ...originalScoresheets.map(mapOriginalScoresheetBase),
          ...sharedScoresheets.map(mapSharedScoresheetBase),
        ].sort(scoresheetSortComparator);
      }

      const sharedScoresheets = await scoresheetRepository.getAllShared(
        {
          sharedWithId: userId,
          where: { sharedGameId: context.sharedGameId },
          with: { scoresheet: true },
        },
        tx,
      );
      return sharedScoresheets
        .map(mapSharedScoresheetBase)
        .sort(scoresheetSortComparator);
    });
  }

  public async getGameScoreSheetsWithRounds(
    args: GetGameScoreSheetsWithRoundsArgs,
  ): Promise<GetGameScoreSheetsWithRoundsOutputType> {
    return this.withGameContext(args, async (context, userId, tx) => {
      if (context.type === "original") {
        const originalScoresheets = await scoresheetRepository.getAll(
          {
            createdBy: userId,
            gameId: context.gameId,
            with: { rounds: { orderBy: { order: "asc" } } },
          },
          tx,
        );
        const sharedScoresheets = await scoresheetRepository.getAllShared(
          {
            sharedWithId: userId,
            where: {
              sharedGameId: { in: context.linkedGameIds },
              linkedScoresheetId: { isNull: true },
            },
            with: {
              scoresheet: true,
              sharedRounds: { with: { round: true } },
            },
          },
          tx,
        );
        return [
          ...originalScoresheets.map((s) => ({
            ...mapOriginalScoresheetBase(s),
            rounds: s.rounds.map(mapRound),
          })),
          ...sharedScoresheets.map((s) => ({
            ...mapSharedScoresheetBase(s),
            rounds: s.sharedRounds.map((sr) => mapRound(sr.round)),
          })),
        ].sort(scoresheetSortComparator);
      }

      const sharedScoresheets = await scoresheetRepository.getAllShared(
        {
          sharedWithId: userId,
          where: { sharedGameId: context.sharedGameId },
          with: {
            scoresheet: true,
            sharedRounds: { with: { round: true } },
          },
        },
        tx,
      );
      return sharedScoresheets
        .map((s) => ({
          ...mapSharedScoresheetBase(s),
          rounds: s.sharedRounds.map((sr) => mapRound(sr.round)),
        }))
        .sort(scoresheetSortComparator);
    });
  }

  /**
   * Resolves the game (original or shared) inside a transaction and delegates
   * to a handler with a normalised context, eliminating repeated resolution
   * and branching boilerplate.
   */
  private async withGameContext<T>(
    args: { input: GetGameInputType; ctx: { userId: string } },
    handler: (
      context: ResolvedGameContext,
      userId: string,
      tx: TransactionType,
    ) => Promise<T>,
  ): Promise<T> {
    const { input, ctx } = args;
    return db.transaction(async (tx) => {
      if (input.type === "original") {
        const returnedGame = await resolveOriginalGame(input, ctx, tx);
        return handler(
          {
            type: "original",
            gameId: returnedGame.id,
            linkedGameIds: returnedGame.linkedGames.map((lg) => lg.id),
          },
          ctx.userId,
          tx,
        );
      }
      const returnedSharedGame = await resolveSharedGame(input, ctx, tx);
      return handler(
        { type: "shared", sharedGameId: returnedSharedGame.id },
        ctx.userId,
        tx,
      );
    });
  }
}

export const gameScoresheetService = new GameScoresheetService();
