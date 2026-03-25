import { db } from "@board-games/db/client";

import type { GetPlayerPlacementDistributionOutputType } from "../../routers/player/sub-routers/stats/player-insights.output";
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
        const placements = rowsForSize
          .map((r) => ({
            placement: r.placement,
            count: r.count,
            percentage: total > 0 ? r.count / total : 0,
          }))
          .toSorted((a, b) => a.placement - b.placement);
        const actualAvgPlacement =
          total > 0
            ? rowsForSize.reduce((s, r) => s + r.placement * r.count, 0) / total
            : null;
        return {
          playerCount,
          matchCount: total,
          expectedAvgPlacement: (playerCount + 1) / 2,
          actualAvgPlacement,
          placements,
        };
      })
      .toSorted((a, b) => a.playerCount - b.playerCount);

    const overallActual =
      placementTotal > 0
        ? dist.placements.reduce((s, p) => s + p.placement * p.count, 0) /
          placementTotal
        : null;
    let expectedWeighted = 0;
    for (const row of byGameSize) {
      expectedWeighted += row.matchCount * row.expectedAvgPlacement;
    }
    const overallPlacementBenchmark =
      placementTotal > 0
        ? {
            matchCount: placementTotal,
            expectedAvgPlacement: expectedWeighted / placementTotal,
            actualAvgPlacement: overallActual,
          }
        : {
            matchCount: 0,
            expectedAvgPlacement: null,
            actualAvgPlacement: null,
          };

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
      overallPlacementBenchmark,
    };
  }
}

export const playerPlacementDistributionReadService =
  new PlayerPlacementDistributionReadService();
