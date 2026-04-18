import { TRPCError } from "@trpc/server";

import { db } from "@board-games/db/client";

import type { GetSharedScoresheetAnalyticsLinkStateOutputType } from "../../routers/game/game.output";
import type {
  GetSharedScoresheetAnalyticsLinkStateArgs,
  LinkSharedRoundsAnalyticsArgs,
  LinkSharedScoresheetAnalyticsArgs,
} from "./game.service.types";
import { roundRepository } from "../../repositories/scoresheet/round.repository";
import { scoresheetRepository } from "../../repositories/scoresheet/scoresheet.repository";

class GameAnalyticsLinkService {
  public async getSharedScoresheetAnalyticsLinkState(
    args: GetSharedScoresheetAnalyticsLinkStateArgs,
  ): Promise<GetSharedScoresheetAnalyticsLinkStateOutputType> {
    const sharedScoresheet =
      await scoresheetRepository.getSharedScoresheetAnalyticsState({
        input: {
          sharedScoresheetId: args.input.sharedScoresheetId,
          userId: args.ctx.userId,
        },
      });

    if (!sharedScoresheet) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Shared scoresheet not found.",
      });
    }

    return {
      sharedScoresheetId: sharedScoresheet.id,
      analyticsLinkedScoresheetId:
        sharedScoresheet.analyticsLinkedScoresheetId ?? null,
      legacyLinkedScoresheetId: sharedScoresheet.linkedScoresheetId ?? null,
      linkageState:
        sharedScoresheet.analyticsLinkedScoresheetId === null
          ? "shared_unlinked"
          : "shared_linked",
      rounds: sharedScoresheet.sharedRounds.map((sharedRound) => ({
        sharedRoundId: sharedRound.id,
        roundId: sharedRound.roundId,
        roundName: sharedRound.round.name,
        analyticsLinkedRoundId: sharedRound.analyticsLinkedRoundId ?? null,
        legacyLinkedRoundId: sharedRound.linkedRoundId ?? null,
        linkageState:
          sharedRound.analyticsLinkedRoundId === null
            ? "shared_unlinked"
            : "shared_linked",
      })),
    };
  }

  public async linkSharedScoresheetAnalytics(
    args: LinkSharedScoresheetAnalyticsArgs,
  ) {
    const { input, ctx } = args;

    await db.transaction(async (tx) => {
      const sharedScoresheet =
        await scoresheetRepository.getSharedScoresheetAnalyticsState({
          input: {
            sharedScoresheetId: input.sharedScoresheetId,
            userId: ctx.userId,
          },
          tx,
        });

      if (!sharedScoresheet) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared scoresheet not found.",
        });
      }

      if (input.analyticsLinkedScoresheetId !== null) {
        const linkedScoresheet = await scoresheetRepository.get(
          {
            id: input.analyticsLinkedScoresheetId,
            createdBy: ctx.userId,
            with: {
              game: true,
            },
          },
          tx,
        );

        if (!linkedScoresheet) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Linked scoresheet not found.",
          });
        }

        if (
          sharedScoresheet.sharedGame.linkedGameId !== null &&
          linkedScoresheet.gameId !== sharedScoresheet.sharedGame.linkedGameId
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Linked scoresheet must belong to the local game linked from this shared game.",
          });
        }
      }

      await scoresheetRepository.linkSharedScoresheetAnalytics({
        input: {
          sharedScoresheetId: input.sharedScoresheetId,
          linkedScoresheetId: input.analyticsLinkedScoresheetId,
        },
        tx,
      });
    });
  }

  public async linkSharedRoundsAnalytics(args: LinkSharedRoundsAnalyticsArgs) {
    const { input, ctx } = args;

    await db.transaction(async (tx) => {
      const sharedScoresheet =
        await scoresheetRepository.getSharedScoresheetAnalyticsState({
          input: {
            sharedScoresheetId: input.sharedScoresheetId,
            userId: ctx.userId,
          },
          tx,
        });

      if (!sharedScoresheet) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared scoresheet not found.",
        });
      }

      const linkedScoresheetId = sharedScoresheet.analyticsLinkedScoresheetId;
      if (linkedScoresheetId === null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Shared scoresheet must be linked to a local scoresheet before linking rounds.",
        });
      }

      const linkedScoresheet = await scoresheetRepository.get(
        {
          id: linkedScoresheetId,
          createdBy: ctx.userId,
          with: {
            rounds: {
              where: {
                deletedAt: {
                  isNull: true,
                },
              },
            },
          },
        },
        tx,
      );

      if (!linkedScoresheet) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Linked scoresheet not found.",
        });
      }

      const sharedRoundIds = new Set(
        sharedScoresheet.sharedRounds.map((sharedRound) => sharedRound.id),
      );
      const localRoundIds = new Set(
        linkedScoresheet.rounds.map((round) => round.id),
      );

      for (const link of input.links) {
        if (!sharedRoundIds.has(link.sharedRoundId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Shared round ${String(link.sharedRoundId)} does not belong to this shared scoresheet.`,
          });
        }

        if (
          link.analyticsLinkedRoundId !== null &&
          !localRoundIds.has(link.analyticsLinkedRoundId)
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Analytics-linked round must belong to the analytics-linked local scoresheet.",
          });
        }
      }

      await roundRepository.bulkLinkSharedRoundsAnalytics({
        input: {
          links: input.links.map((link) => ({
            sharedRoundId: link.sharedRoundId,
            linkedRoundId: link.analyticsLinkedRoundId,
          })),
        },
        tx,
      });
    });
  }
}

export const gameAnalyticsLinkService = new GameAnalyticsLinkService();
