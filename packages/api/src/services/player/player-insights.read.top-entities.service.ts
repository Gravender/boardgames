import { db } from "@board-games/db/client";

import type {
  GetPlayerTopRivalsOutputType,
  GetPlayerTopTeammatesOutputType,
} from "../../routers/player/sub-routers/stats/player-insights.output";
import type { GetPlayerInsightsArgs } from "./player.service.types";
import { getInsightsTarget } from "./player-insights.read.target";
import { getSortedInsightRows } from "./player-insights.read.rows";
import { computePlayerTopRivals } from "./player-insights.read.rivals";
import { computePlayerTopTeammates } from "./player-insights.read.teammates";

class PlayerTopEntitiesReadService {
  public async getPlayerTopRivals(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerTopRivalsOutputType> {
    const { player, rows } = await db.transaction(async (tx) => {
      const p = await getInsightsTarget(args, tx);
      const r = await getSortedInsightRows({ ...args, tx });
      return { player: p, rows: r };
    });
    const rivals = await computePlayerTopRivals({
      ctx: args.ctx,
      input: args.input,
      rows,
    });
    return { player, rivals };
  }

  public async getPlayerTopTeammates(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerTopTeammatesOutputType> {
    const { player, rows } = await db.transaction(async (tx) => {
      const p = await getInsightsTarget(args, tx);
      const r = await getSortedInsightRows({ ...args, tx });
      return { player: p, rows: r };
    });
    const teammates = await computePlayerTopTeammates({
      ctx: args.ctx,
      input: args.input,
      rows,
    });
    return { player, teammates };
  }
}

export const playerTopEntitiesReadService = new PlayerTopEntitiesReadService();
