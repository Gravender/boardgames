import { and, eq, inArray } from "drizzle-orm";

import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";
import { team } from "@board-games/db/schema";

class TeamRepository {
  public async get(args: { id: number; tx?: TransactionType }) {
    const { id, tx } = args;
    const database = tx ?? db;
    const foundTeam = await database.query.team.findFirst({
      where: {
        id: id,
      },
    });
    return foundTeam;
  }

  public async createTeam(args: {
    input: {
      name: string;
      matchId: number;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [insertedTeam] = await database
      .insert(team)
      .values({
        name: input.name,
        matchId: input.matchId,
      })
      .returning();
    return insertedTeam;
  }
  public async updateTeam(args: {
    input: {
      id: number;
      name: string;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [updatedTeam] = await database
      .update(team)
      .set({
        name: input.name,
      })
      .where(eq(team.id, input.id))
      .returning();
    return updatedTeam;
  }
  public async deleteTeams(args: {
    input: {
      matchId: number;
      teamIds: number[];
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const deletedTeams = await database
      .delete(team)
      .where(
        and(eq(team.matchId, input.matchId), inArray(team.id, input.teamIds)),
      )
      .returning();
    return deletedTeams;
  }
}
export const teamRepository = new TeamRepository();
