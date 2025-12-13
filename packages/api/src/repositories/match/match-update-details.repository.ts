import { eq } from "drizzle-orm";

import { db } from "@board-games/db/client";
import { matchPlayer, team } from "@board-games/db/schema";

import type {
  UpdateMatchPlayerDetailsRepoArgs,
  UpdateTeamDetailsRepoArgs,
} from "./match-update-details.repository.types";

class MatchUpdateDetailsRepository {
  public async updateMatchPlayerDetails(
    args: UpdateMatchPlayerDetailsRepoArgs,
  ) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(matchPlayer)
      .set({ details: input.details })
      .where(eq(matchPlayer.id, input.id));
  }

  public async updateTeamDetails(args: UpdateTeamDetailsRepoArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(team)
      .set({
        details: input.details,
      })
      .where(eq(team.id, input.teamId));
  }
}

export const matchUpdateDetailsRepository = new MatchUpdateDetailsRepository();
