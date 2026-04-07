import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";

import type { TransactionType } from "@board-games/db/client";
import { gameRole, match, player, scoresheet } from "@board-games/db/schema";

import type {
  GameRoleToShareInputType,
  ShareGameMatchInputType,
} from "../../routers/sharing/sharing.input";

export const assertShareGamePayloadValid = async (
  tx: TransactionType,
  params: {
    userId: string;
    gameId: number;
    sharedMatches: ShareGameMatchInputType[];
    scoresheetIds: number[];
    gameRolesToShare: GameRoleToShareInputType[];
  },
): Promise<void> => {
  const { userId, gameId, sharedMatches, scoresheetIds, gameRolesToShare } =
    params;

  const matchIds = sharedMatches.map((m) => m.matchId);
  if (matchIds.length > 0) {
    const rows = await tx
      .select({ id: match.id })
      .from(match)
      .where(
        and(
          inArray(match.id, matchIds),
          eq(match.createdBy, userId),
          eq(match.gameId, gameId),
          isNull(match.deletedAt),
        ),
      );
    if (rows.length !== matchIds.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "One or more matches are invalid or not owned by you.",
      });
    }

    for (const sm of sharedMatches) {
      if (!sm.includePlayers || !sm.playerIds?.length) {
        continue;
      }
      const mRow = await tx.query.match.findFirst({
        where: {
          id: sm.matchId,
          createdBy: userId,
          gameId,
        },
        with: {
          matchPlayers: { columns: { playerId: true } },
        },
      });
      if (!mRow) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Match ${sm.matchId} not found.`,
        });
      }
      const onMatch = new Set(mRow.matchPlayers.map((mp) => mp.playerId));
      for (const pid of sm.playerIds) {
        if (!onMatch.has(pid)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Player ${pid} is not part of match ${sm.matchId}.`,
          });
        }
      }
      const playerRows = await tx
        .select({ id: player.id })
        .from(player)
        .where(
          and(inArray(player.id, sm.playerIds), eq(player.createdBy, userId)),
        );
      if (playerRows.length !== sm.playerIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more players are invalid or not owned by you.",
        });
      }
    }

    for (const sm of sharedMatches) {
      if (sm.includeLocation === false) {
        continue;
      }
      const m = await tx.query.match.findFirst({
        where: { id: sm.matchId, createdBy: userId, gameId },
        columns: { locationId: true },
      });
      if (!m?.locationId) {
        continue;
      }
      const loc = await tx.query.location.findFirst({
        where: { id: m.locationId, createdBy: userId },
      });
      if (!loc) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Location for match ${sm.matchId} cannot be shared.`,
        });
      }
    }
  }

  if (scoresheetIds.length > 0) {
    const sheets = await tx
      .select({ id: scoresheet.id })
      .from(scoresheet)
      .where(
        and(
          inArray(scoresheet.id, scoresheetIds),
          eq(scoresheet.createdBy, userId),
          eq(scoresheet.gameId, gameId),
          isNull(scoresheet.deletedAt),
        ),
      );
    if (sheets.length !== scoresheetIds.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "One or more scoresheets are invalid or not owned by you.",
      });
    }
  }

  const roleIds = gameRolesToShare.map((r) => r.gameRoleId);
  if (roleIds.length > 0) {
    const roles = await tx
      .select({ id: gameRole.id })
      .from(gameRole)
      .where(
        and(
          inArray(gameRole.id, roleIds),
          eq(gameRole.createdBy, userId),
          eq(gameRole.gameId, gameId),
          isNull(gameRole.deletedAt),
        ),
      );
    if (roles.length !== roleIds.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "One or more game roles are invalid or not owned by you.",
      });
    }
  }
};
