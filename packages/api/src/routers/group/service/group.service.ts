import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@board-games/db/client";
import { player } from "@board-games/db/schema";

import { gameMatchesRepository } from "../../../repositories/game/game-matches.repository";
import { mapRepositoryMatchRowsToMatchListOutput } from "../../../services/game/game-matches-list-mapping";
import type {
  GetGroupOutputType,
  GetGroupsOutputType,
  GetGroupWithPlayersOutputType,
  UpdateGroupOutputType,
} from "../group.output";
import { groupRepository } from "../repository/group.repository";
import type {
  CreateGroupArgs,
  DeleteGroupArgs,
  GetGroupArgs,
  GetGroupsArgs,
  GetGroupsWithPlayersArgs,
  UpdateGroupArgs,
  UpdateGroupPlayersArgs,
} from "./group.service.types";

/**
 * Resolves which of `playerIds` exist for `userId`, are not soft-deleted, and
 * belong to that user. Used only by service-layer ownership checks.
 */
async function queryPlayerIdsOwnedByUser(userId: string, playerIds: number[]) {
  if (playerIds.length === 0) {
    return [];
  }
  const rows = await db
    .select({ id: player.id })
    .from(player)
    .where(
      and(
        eq(player.createdBy, userId),
        inArray(player.id, playerIds),
        isNull(player.deletedAt),
      ),
    );
  return rows.map((r) => r.id);
}

class GroupService {
  public async getGroups(args: GetGroupsArgs): Promise<GetGroupsOutputType> {
    const raw = await groupRepository.findGroupsWithPlayersByCreator(
      args.ctx.userId,
    );

    return raw.map((g) => ({
      id: g.id,
      name: g.name,
      players: g.players
        .filter((p) => p.deletedAt === null)
        .map((p) => ({
          id: p.id,
          name: p.name,
          type: "original" as const,
        })),
    }));
  }

  public async getGroupsWithPlayers(
    args: GetGroupsWithPlayersArgs,
  ): Promise<GetGroupWithPlayersOutputType> {
    const raw = await groupRepository.findGroupsWithPlayersByCreator(
      args.ctx.userId,
    );

    const userId = args.ctx.userId;
    const withCounts: Array<{
      id: number;
      name: string;
      players: Array<{
        id: number;
        name: string;
        type: "original";
      }>;
      matches: number;
    }> = [];

    for (const g of raw) {
      const activePlayers = g.players.filter((p) => p.deletedAt === null);
      const playerIds = activePlayers.map((p) => p.id);
      const matchIds = await gameMatchesRepository.getGroupMatchIdsForUser({
        userId,
        playerIds,
      });
      withCounts.push({
        id: g.id,
        name: g.name,
        players: activePlayers.map((p) => ({
          id: p.id,
          name: p.name,
          type: "original" as const,
        })),
        matches: matchIds.length,
      });
    }

    withCounts.sort((a, b) => {
      if (a.matches !== b.matches) return b.matches - a.matches;
      return a.name.localeCompare(b.name);
    });

    return {
      groups: withCounts.filter((g) => g.players.length > 0),
    };
  }

  public async getGroup(args: GetGroupArgs): Promise<GetGroupOutputType> {
    const row = await groupRepository.findGroupWithPlayersOwnedBy(
      args.id,
      args.ctx.userId,
    );
    if (!row) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
    }

    const activePlayers = row.players.filter((p) => p.deletedAt === null);
    const playerIds = activePlayers.map((p) => p.id);
    const matchRows = await gameMatchesRepository.getGroupMatchesForUser({
      userId: args.ctx.userId,
      playerIds,
    });
    const matches = mapRepositoryMatchRowsToMatchListOutput(
      matchRows,
      "original",
    );

    return {
      id: row.id,
      name: row.name,
      players: activePlayers.map((p) => ({
        id: p.id,
        name: p.name,
        type: "original" as const,
      })),
      matches,
    };
  }

  public async createGroup(args: CreateGroupArgs): Promise<void> {
    const userId = args.ctx.userId;
    const uniqueIds = [...new Set(args.players.map((p) => p.id))];

    if (uniqueIds.length > 0) {
      const owned = await queryPlayerIdsOwnedByUser(userId, uniqueIds);
      if (owned.length !== uniqueIds.length) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "One or more players are invalid or not owned by you",
        });
      }
    }

    const inserted = await groupRepository.insertGroup(userId, args.name);
    if (!inserted) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    await groupRepository.insertGroupPlayerLinks(inserted.id, uniqueIds);
  }

  public async updateGroup(
    args: UpdateGroupArgs,
  ): Promise<UpdateGroupOutputType> {
    const row = await groupRepository.updateGroupName(
      args.id,
      args.ctx.userId,
      args.name,
    );
    if (!row) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
    }
    return row;
  }

  public async updateGroupPlayers(args: UpdateGroupPlayersArgs): Promise<void> {
    const userId = args.ctx.userId;
    const groupId = args.groupId;

    const existing = await groupRepository.findGroupOwnedBy(groupId, userId);
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
    }

    const addIds = [...new Set(args.playersToAdd.map((p) => p.id))];
    const removeIds = [...new Set(args.playersToRemove.map((p) => p.id))];

    if (addIds.length > 0) {
      const owned = await queryPlayerIdsOwnedByUser(userId, addIds);
      if (owned.length !== addIds.length) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "One or more players are invalid or not owned by you",
        });
      }
      await groupRepository.insertGroupPlayerLinks(groupId, addIds);
    }

    if (removeIds.length > 0) {
      await groupRepository.deleteGroupPlayerLinks(groupId, removeIds);
    }
  }

  public async deleteGroup(args: DeleteGroupArgs): Promise<void> {
    const userId = args.ctx.userId;
    const id = args.id;

    await groupRepository.deleteAllGroupPlayers(id);
    const deleted = await groupRepository.deleteGroupIfOwned(id, userId);
    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
    }
  }
}

export const groupService = new GroupService();
