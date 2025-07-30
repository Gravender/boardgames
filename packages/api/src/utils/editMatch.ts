import type z from "zod/v4";
import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";
import type {
  insertMatchPlayerSchema,
  insertRoundPlayerSchema,
  selectRoundPlayerSchema,
  selectRoundSchema,
} from "@board-games/db/zodSchema";
import {
  matchPlayer,
  matchPlayerRole,
  roundPlayer,
} from "@board-games/db/schema";

import { processPlayer } from "./addMatch";

export async function addPlayersToMatch(
  transaction: TransactionType,
  matchId: number,
  playersToAdd: {
    id: number;
    type: "original" | "shared";
    teamId: number | null;
    roles: number[];
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
  userId: number,
) {
  const insertedMatchPlayers: {
    id: number;
    teamId: number | null;
    playerId: number;
    roles: number[];
  }[] = [];
  const playersToInsert: {
    processedPlayer: z.infer<typeof insertMatchPlayerSchema>;
    roles: number[];
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
      roleId: role,
    })),
  );
  if (rolesToAdd.length > 0) {
    await transaction.insert(matchPlayerRole).values(rolesToAdd);
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
