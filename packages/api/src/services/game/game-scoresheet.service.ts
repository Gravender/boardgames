import { TRPCError } from "@trpc/server";

import { db } from "@board-games/db/client";

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

class GameScoresheetService {
  public async getGameScoresheets(
    args: GetGameScoresheetsArgs,
  ): Promise<GetGameScoresheetsOutputType> {
    const { input, ctx } = args;
    const response = await db.transaction(async (tx) => {
      if (input.type === "original") {
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
        const originalScoresheets = await scoresheetRepository.getAll(
          {
            createdBy: ctx.userId,
            gameId: returnedGame.id,
          },
          tx,
        );
        const sharedScoresheets = await scoresheetRepository.getAllShared(
          {
            sharedWithId: ctx.userId,
            where: {
              linkedScoresheetId: {
                isNull: true,
              },
              sharedGameId: {
                in: returnedGame.linkedGames.map((lg) => lg.id),
              },
            },
            with: {
              scoresheet: true,
            },
          },
          tx,
        );
        const mappedOriginalScoresheets = originalScoresheets.map(
          (scoresheet) => {
            return {
              id: scoresheet.id,
              name: scoresheet.name,
              type: "original" as const,
              isDefault: scoresheet.type === "Default",
              winCondition: scoresheet.winCondition,
              isCoop: scoresheet.isCoop,
              roundsScore: scoresheet.roundsScore,
              targetScore: scoresheet.targetScore,
            };
          },
        );
        const mappedSharedScoresheets = sharedScoresheets.map(
          (sharedScoresheet) => {
            return {
              sharedId: sharedScoresheet.id,
              name: sharedScoresheet.scoresheet.name,
              type: "shared" as const,
              permission: sharedScoresheet.permission,
              isDefault: sharedScoresheet.isDefault,
              winCondition: sharedScoresheet.scoresheet.winCondition,
              isCoop: sharedScoresheet.scoresheet.isCoop,
              roundsScore: sharedScoresheet.scoresheet.roundsScore,
              targetScore: sharedScoresheet.scoresheet.targetScore,
            };
          },
        );
        const combinedScoresheets = [
          ...mappedOriginalScoresheets,
          ...mappedSharedScoresheets,
        ];
        combinedScoresheets.sort((a, b) => {
          if (a.isDefault && !b.isDefault) return -1;
          if (!a.isDefault && b.isDefault) return 1;
          return a.name.localeCompare(b.name);
        });
        return combinedScoresheets;
      } else {
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
        const sharedScoresheets = await scoresheetRepository.getAllShared(
          {
            sharedWithId: ctx.userId,
            where: {
              sharedGameId: returnedSharedGame.id,
            },
            with: {
              scoresheet: true,
              sharedRounds: {
                with: {
                  round: true,
                },
              },
            },
          },
          tx,
        );
        return sharedScoresheets
          .map((sharedScoresheet) => {
            return {
              sharedId: sharedScoresheet.id,
              name: sharedScoresheet.scoresheet.name,
              type: "shared" as const,
              permission: sharedScoresheet.permission,
              isDefault: sharedScoresheet.isDefault,
              winCondition: sharedScoresheet.scoresheet.winCondition,
              isCoop: sharedScoresheet.scoresheet.isCoop,
              roundsScore: sharedScoresheet.scoresheet.roundsScore,
              targetScore: sharedScoresheet.scoresheet.targetScore,
            };
          })
          .sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return a.name.localeCompare(b.name);
          });
      }
    });
    return response;
  }

  public async getGameScoreSheetsWithRounds(
    args: GetGameScoreSheetsWithRoundsArgs,
  ): Promise<GetGameScoreSheetsWithRoundsOutputType> {
    const { input, ctx } = args;
    const response = await db.transaction(async (tx) => {
      if (input.type === "original") {
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
        const originalScoresheets = await scoresheetRepository.getAll(
          {
            createdBy: ctx.userId,
            gameId: returnedGame.id,
            with: {
              rounds: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
          tx,
        );
        const sharedScoresheets = await scoresheetRepository.getAllShared(
          {
            sharedWithId: ctx.userId,
            where: {
              sharedGameId: {
                in: returnedGame.linkedGames.map((lg) => lg.id),
              },
              linkedScoresheetId: {
                isNull: true,
              },
            },
            with: {
              scoresheet: true,
              sharedRounds: {
                with: {
                  round: true,
                },
              },
            },
          },
          tx,
        );
        const mappedOriginalScoresheets = originalScoresheets.map(
          (scoresheet) => {
            return {
              id: scoresheet.id,
              name: scoresheet.name,
              type: "original" as const,
              isDefault: scoresheet.type === "Default",
              winCondition: scoresheet.winCondition,
              isCoop: scoresheet.isCoop,
              roundsScore: scoresheet.roundsScore,
              targetScore: scoresheet.targetScore,
              rounds: scoresheet.rounds.map((round) => ({
                id: round.id,
                name: round.name,
                type: round.type,
                order: round.order,
                score: round.score,
                color: round.color,
                lookup: round.lookup,
                modifier: round.modifier,
              })),
            };
          },
        );
        const mappedSharedScoresheets = sharedScoresheets.map(
          (sharedScoresheet) => {
            return {
              sharedId: sharedScoresheet.id,
              name: sharedScoresheet.scoresheet.name,
              type: "shared" as const,
              permission: sharedScoresheet.permission,
              isDefault: sharedScoresheet.isDefault,
              winCondition: sharedScoresheet.scoresheet.winCondition,
              isCoop: sharedScoresheet.scoresheet.isCoop,
              roundsScore: sharedScoresheet.scoresheet.roundsScore,
              targetScore: sharedScoresheet.scoresheet.targetScore,
              rounds: sharedScoresheet.sharedRounds.map((sharedRound) => ({
                id: sharedRound.round.id,
                name: sharedRound.round.name,
                type: sharedRound.round.type,
                order: sharedRound.round.order,
                score: sharedRound.round.score,
                color: sharedRound.round.color,
                lookup: sharedRound.round.lookup,
                modifier: sharedRound.round.modifier,
              })),
            };
          },
        );
        const combinedScoresheets = [
          ...mappedOriginalScoresheets,
          ...mappedSharedScoresheets,
        ];
        combinedScoresheets.sort((a, b) => {
          if (a.isDefault && !b.isDefault) return -1;
          if (!a.isDefault && b.isDefault) return 1;
          return a.name.localeCompare(b.name);
        });
        return combinedScoresheets;
      } else {
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
        const sharedScoresheets = await scoresheetRepository.getAllShared(
          {
            sharedWithId: ctx.userId,
            where: {
              sharedGameId: returnedSharedGame.id,
            },
            with: {
              scoresheet: true,
              sharedRounds: {
                with: {
                  round: true,
                },
              },
            },
          },
          tx,
        );
        return sharedScoresheets
          .map((sharedScoresheet) => {
            return {
              sharedId: sharedScoresheet.id,
              name: sharedScoresheet.scoresheet.name,
              type: "shared" as const,
              permission: sharedScoresheet.permission,
              isDefault: sharedScoresheet.isDefault,
              winCondition: sharedScoresheet.scoresheet.winCondition,
              isCoop: sharedScoresheet.scoresheet.isCoop,
              roundsScore: sharedScoresheet.scoresheet.roundsScore,
              targetScore: sharedScoresheet.scoresheet.targetScore,
              rounds: sharedScoresheet.sharedRounds.map((sharedRound) => ({
                id: sharedRound.round.id,
                name: sharedRound.round.name,
                type: sharedRound.round.type,
                order: sharedRound.round.order,
                score: sharedRound.round.score,
                color: sharedRound.round.color,
                lookup: sharedRound.round.lookup,
                modifier: sharedRound.round.modifier,
              })),
            };
          })
          .sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return a.name.localeCompare(b.name);
          });
      }
    });
    return response;
  }
}

export const gameScoresheetService = new GameScoresheetService();
