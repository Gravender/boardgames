import { TRPCError } from "@trpc/server";

import { db } from "@board-games/db/client";

import type { CreateMatchOutputType } from "../../routers/match/match.output";
import type {
  CreateMatchArgs,
  DeleteMatchArgs,
  EditMatchArgs,
} from "./match.service.types";
import { matchRepository } from "../../repositories/match/match.repository";
import { matchPlayerRepository } from "../../repositories/match/matchPlayer.repository";
import { scoresheetRepository } from "../../repositories/scoresheet/scoresheet.repository";
import { assertFound, assertInserted } from "../../utils/databaseHelpers";
import { friendService } from "../social/friend.service";
import { matchEditOriginalService } from "./match-edit-original.service";
import { matchEditSharedService } from "./match-edit-shared.service";
import { matchParticipantsService } from "./match-participants.service";
import { matchQueryService } from "./match-query.service";
import { matchSetupService } from "./match-setup.service";

class MatchService {
  // ── Queries (delegated to matchQueryService) ──────────────────

  public readonly getMatch = matchQueryService.getMatch.bind(matchQueryService);
  public readonly getMatchScoresheet =
    matchQueryService.getMatchScoresheet.bind(matchQueryService);
  public readonly getMatchPlayersAndTeams =
    matchQueryService.getMatchPlayersAndTeams.bind(matchQueryService);
  public readonly getMatchSummary =
    matchQueryService.getMatchSummary.bind(matchQueryService);

  // ── Create ────────────────────────────────────────────────────

  public async createMatch(
    args: CreateMatchArgs,
  ): Promise<CreateMatchOutputType> {
    const {
      input,
      ctx: { userId, posthog },
    } = args;
    const response = await db.transaction(async (tx) => {
      try {
        const gameId = await matchSetupService.resolveGameForMatch({
          gameInput: input.game,
          userId,
          tx,
        });

        const matchScoresheet = await matchSetupService.resolveMatchScoresheet({
          scoresheetInput: input.scoresheet,
          userId,
          gameId,
          tx,
        });
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (matchScoresheet.type !== "Match") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Match must use a scoresheet with type Match. Invalid scoresheet type.",
          });
        }

        const locationId = await matchSetupService.resolveLocationForMatch({
          locationInput: input.location,
          userId,
          tx,
        });

        const insertedMatch = await matchRepository.insert(
          {
            name: input.name,
            date: input.date,
            gameId: gameId,
            locationId: locationId,
            createdBy: userId,
            scoresheetId: matchScoresheet.id,
            running: true,
          },
          tx,
        );

        assertInserted(
          insertedMatch,
          {
            userId: args.ctx.userId,
            value: args.input,
          },
          "Match not created.",
        );

        await scoresheetRepository.update({
          input: {
            id: matchScoresheet.id,
            forkedForMatchId: insertedMatch.id,
          },
          tx,
        });

        const { mappedMatchPlayers } =
          await matchParticipantsService.createTeamsPlayersAndRounds({
            input,
            matchId: insertedMatch.id,
            gameId: insertedMatch.gameId,
            userId,
            tx,
            scoresheetRoundIds: matchScoresheet.rounds.map((r) => r.id),
            posthog,
          });
        return {
          match: insertedMatch,
          players: mappedMatchPlayers.map((mp) => ({
            matchPlayerId: mp.matchPlayerId,
            playerId: mp.playerId,
          })),
        };
      } catch (e) {
        await posthog.captureImmediate({
          distinctId: args.ctx.userId,
          event: "match.insert failure",
          properties: {
            error: e,
            input: args.input,
          },
        });
        if (e instanceof TRPCError) {
          throw e;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Match Insert Failure",
          cause: {
            error: e,
            input: args.input,
          },
        });
      }
    });
    try {
      await friendService.autoShareMatch({
        input: {
          matchId: response.match.id,
        },
        ctx: {
          userId: args.ctx.userId,
        },
      });
    } catch (e) {
      await posthog.captureImmediate({
        distinctId: args.ctx.userId,
        event: "friend share failure",
        properties: {
          error: e,
          response: response,
          input: args.input,
        },
      });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Friend Share Failure",
        cause: {
          error: e,
          response: response,
          input: args.input,
        },
      });
    }

    return {
      id: response.match.id,
      date: response.match.date,
      name: response.match.name,
      game: {
        id: response.match.gameId,
      },
      location: response.match.locationId
        ? {
            id: response.match.locationId,
          }
        : null,
      players: response.players.map((mp) => ({
        id: mp.playerId,
      })),
    };
  }

  // ── Delete ────────────────────────────────────────────────────

  public async deleteMatch(args: DeleteMatchArgs) {
    const { input } = args;
    await db.transaction(async (tx) => {
      const returnedMatch = await matchRepository.get(
        {
          id: input.id,
          createdBy: args.ctx.userId,
        },
        tx,
      );
      assertFound(
        returnedMatch,
        {
          userId: args.ctx.userId,
          value: input,
        },
        "Match not found.",
      );
      await matchPlayerRepository.deleteMatchPlayersByMatchId({
        input: {
          matchId: returnedMatch.id,
        },
        tx,
      });
      await matchRepository.deleteMatch({
        input: {
          id: returnedMatch.id,
          createdBy: args.ctx.userId,
        },
        tx,
      });
      await scoresheetRepository.deleteScoresheet({
        input: {
          id: returnedMatch.scoresheetId,
          createdBy: args.ctx.userId,
        },
        tx,
      });
    });
  }

  // ── Edit (dispatches to original / shared sub-services) ───────

  public async editMatch(args: EditMatchArgs) {
    if (args.input.type === "original") {
      return matchEditOriginalService.editOriginalMatch({
        input: args.input,
        ctx: args.ctx,
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (args.input.type === "shared") {
      return matchEditSharedService.editSharedMatch({
        input: args.input,
        ctx: args.ctx,
      });
    }
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unknown match type.",
    });
  }
}

export const matchService = new MatchService();
