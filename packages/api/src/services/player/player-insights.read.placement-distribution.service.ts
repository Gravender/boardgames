import { db } from "@board-games/db/client";

import type { GetPlayerPlacementDistributionOutputType } from "../../routers/player/player-insights.output";
import { playerInsightsRepository } from "../../repositories/player/player-insights.repository";
import type { GetPlayerInsightsArgs } from "./player.service.types";
import { getInsightsTarget } from "./player-insights.read.target";

class PlayerPlacementDistributionReadService {
  public async getPlayerPlacementDistribution(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerPlacementDistributionOutputType> {
    const { player, dist } = await db.transaction(async (tx) => {
      const p = await getInsightsTarget(args, tx);
      const d = await playerInsightsRepository.getPlacementDistribution({
        userId: args.ctx.userId,
        input: args.input,
        tx,
      });
      return { player: p, dist: d };
    });
    const placementTotal = dist.placements.reduce((acc, p) => acc + p.count, 0);
    const bySizeMap = new Map<number, typeof dist.byGameSize>();
    for (const row of dist.byGameSize) {
      const list = bySizeMap.get(row.playerCount) ?? [];
      list.push(row);
      bySizeMap.set(row.playerCount, list);
    }
    const byGameSize = Array.from(bySizeMap.entries())
      .map(([playerCount, rowsForSize]) => {
        const total = rowsForSize.reduce((s, r) => s + r.count, 0);
        return {
          playerCount,
          placements: rowsForSize
            .map((r) => ({
              placement: r.placement,
              count: r.count,
              percentage: total > 0 ? r.count / total : 0,
            }))
            .toSorted((a, b) => a.placement - b.placement),
        };
      })
      .toSorted((a, b) => a.playerCount - b.playerCount);
    return {
      player,
      placements: dist.placements
        .map((p) => ({
          placement: p.placement,
          count: p.count,
          percentage: placementTotal > 0 ? p.count / placementTotal : 0,
        }))
        .toSorted((a, b) => a.placement - b.placement),
      byGameSize,
    };
  }
}

export const playerPlacementDistributionReadService =
  new PlayerPlacementDistributionReadService();
