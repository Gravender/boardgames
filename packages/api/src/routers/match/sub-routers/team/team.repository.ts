import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";
import { team } from "@board-games/db/schema";

class TeamRepository {
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
}
export const teamRepository = new TeamRepository();
