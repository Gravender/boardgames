import type z from "zod/v4";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import type { TransactionType } from "@board-games/db/client";
import type {
  insertMatchPlayerSchema,
  insertRoundPlayerSchema,
  selectRoundPlayerSchema,
  selectRoundSchema,
} from "@board-games/db/zodSchema";
import {
  gameRole,
  matchPlayer,
  matchPlayerRole,
  roundPlayer,
  sharedGameRole,
} from "@board-games/db/schema";

import { processPlayer } from "./addMatch";

export async function addPlayersToMatch(
  transaction: TransactionType,
  matchId: number,
  playersToAdd: {
    id: number;
    type: "original" | "shared" | "linked";
    teamId: number | null;
    roles: {
      id: number;
      type: "original" | "shared" | "linked";
    }[];
  }[],
  teams: {
    id: number;
    teamId: number;
    placement: number | null;
    winner: boolean;
    score: number | null;
    rounds: z.infer<typeof selectRoundPlayerSchema>[];
  }[],
  rounds: z.infer<typeof selectRoundSchema>[],
  userId: string,
) {
  const insertedMatchPlayers: {
    id: number;
    teamId: number | null;
    playerId: number;
    roles: {
      id: number;
      type: "original" | "shared" | "linked";
    }[];
  }[] = [];
  const playersToInsert: {
    processedPlayer: z.infer<typeof insertMatchPlayerSchema>;
    roles: {
      id: number;
      type: "original" | "shared" | "linked";
    }[];
  }[] = await Promise.all(
    playersToAdd.map(async (p) => {
      const processedPlayer = await processPlayer(
        transaction,
        matchId,
        p,
        null,
        userId,
      );
      const foundTeam = teams.find((t) => t.id === p.teamId);
      return {
        processedPlayer: {
          matchId,
          playerId: processedPlayer.playerId,
          teamId: foundTeam?.teamId ?? null,
          score: foundTeam?.score ?? null,
          placement: foundTeam?.placement ?? null,
          winner: foundTeam?.winner ?? null,
        },
        roles: p.roles,
      };
    }),
  );
  if (playersToInsert.length === 0) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Edit Match No Match Players to Insert",
    });
  }
  const returnedMatchPlayers = await transaction
    .insert(matchPlayer)
    .values(playersToInsert.map((p) => p.processedPlayer))
    .returning();

  returnedMatchPlayers.forEach((returnedMatchPlayer) => {
    const foundMatchPlayer = playersToInsert.find(
      (mp) => mp.processedPlayer.playerId === returnedMatchPlayer.playerId,
    );
    if (!foundMatchPlayer) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Edit Match Match players not created",
      });
    }
    insertedMatchPlayers.push({
      id: returnedMatchPlayer.id,
      teamId: returnedMatchPlayer.teamId,
      playerId: returnedMatchPlayer.playerId,
      roles: foundMatchPlayer.roles,
    });
  });
  const rolesToAdd = insertedMatchPlayers.flatMap((p) =>
    p.roles.map((role) => ({
      matchPlayerId: p.id,
      roleId: role.id,
      type: role.type,
    })),
  );
  if (rolesToAdd.length > 0) {
    const originalRoles = rolesToAdd.filter(
      (roleToAdd) =>
        roleToAdd.type === "original" || roleToAdd.type === "linked",
    );
    const sharedRoles = rolesToAdd.filter(
      (roleToAdd) => roleToAdd.type === "shared",
    );
    await transaction.insert(matchPlayerRole).values(
      originalRoles.map((originalRole) => ({
        matchPlayerId: originalRole.matchPlayerId,
        roleId: originalRole.roleId,
      })),
    );
    const returnedMatch = await transaction.query.match.findFirst({
      where: {
        id: matchId,
        createdBy: userId,
      },
    });
    if (!returnedMatch) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Match not found.",
      });
    }
    const uniqueRoles = sharedRoles.reduce<
      {
        id: number;
      }[]
    >((acc, role) => {
      const existingRole = acc.find((r) => r.id === role.roleId);
      if (!existingRole) {
        acc.push({
          id: role.roleId,
        });
      }
      return acc;
    }, []);
    const mappedSharedRoles: {
      sharedRoleId: number;
      createRoleId: number;
    }[] = [];
    for (const uniqueRole of uniqueRoles) {
      const returnedSharedRole =
        await transaction.query.sharedGameRole.findFirst({
          where: {
            gameRoleId: uniqueRole.id,
            sharedWithId: userId,
          },
          with: {
            gameRole: true,
          },
        });
      if (!returnedSharedRole) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared role not found.",
        });
      }
      let linkedGameRoleId = returnedSharedRole.linkedGameRoleId;
      if (!linkedGameRoleId) {
        const [createdGameRole] = await transaction
          .insert(gameRole)
          .values({
            gameId: returnedMatch.gameId,
            name: returnedSharedRole.gameRole.name,
            description: returnedSharedRole.gameRole.description,
            createdBy: userId,
          })
          .returning();
        if (!createdGameRole) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create game role",
          });
        }
        await transaction
          .update(sharedGameRole)
          .set({
            linkedGameRoleId: createdGameRole.id,
          })
          .where(eq(sharedGameRole.id, returnedSharedRole.id));
        linkedGameRoleId = createdGameRole.id;
      }
      mappedSharedRoles.push({
        sharedRoleId: uniqueRole.id,
        createRoleId: linkedGameRoleId,
      });
    }
    const mappedSharedRolesWithMatchPlayers: {
      matchPlayerId: number;
      roleId: number;
    }[] = sharedRoles.map((role) => {
      const createdRole = mappedSharedRoles.find(
        (r) => r.sharedRoleId === role.roleId,
      );
      if (!createdRole) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared role not found.",
        });
      }
      return {
        matchPlayerId: role.matchPlayerId,
        roleId: createdRole.createRoleId,
      };
    });
    await transaction
      .insert(matchPlayerRole)
      .values(mappedSharedRolesWithMatchPlayers);
  }
  const roundPlayersToInsert: z.infer<typeof insertRoundPlayerSchema>[] =
    rounds.flatMap((round) => {
      return insertedMatchPlayers.map((player) => {
        const teamPlayer = teams.find((t) => t.teamId === player.teamId);
        if (teamPlayer) {
          return {
            roundId: round.id,
            matchPlayerId: player.id,
            score:
              teamPlayer.rounds.find((pRound) => pRound.roundId === round.id)
                ?.score ?? null,
          };
        }

        return {
          roundId: round.id,
          matchPlayerId: player.id,
        };
      });
    });
  if (roundPlayersToInsert.length > 0) {
    await transaction.insert(roundPlayer).values(roundPlayersToInsert);
  }
}
