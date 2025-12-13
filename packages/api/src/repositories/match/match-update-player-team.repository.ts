import { and, eq, inArray } from "drizzle-orm";

import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";
import { matchPlayer } from "@board-games/db/schema";

import type {
  UpdateMatchPlayerTeamRepoArgs,
  UpdateMatchPlayersTeamRepoArgs,
} from "./match-update-player-team.repository.types";

class MatchUpdatePlayerTeamRepository {
  public async updateMatchPlayerTeam(args: UpdateMatchPlayerTeamRepoArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [updatedMatchPlayer] = await database
      .update(matchPlayer)
      .set({
        teamId: input.teamId,
      })
      .where(eq(matchPlayer.id, input.id))
      .returning();
    return updatedMatchPlayer;
  }

  public async updateMatchPlayersTeam(args: UpdateMatchPlayersTeamRepoArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const updatedMatchPlayers = await database
      .update(matchPlayer)
      .set({
        teamId: input.teamId,
      })
      .where(
        and(
          eq(matchPlayer.matchId, input.matchId),
          inArray(matchPlayer.id, input.matchPlayerIds),
        ),
      )
      .returning();
    return updatedMatchPlayers;
  }
}

export const matchUpdatePlayerTeamRepository =
  new MatchUpdatePlayerTeamRepository();

