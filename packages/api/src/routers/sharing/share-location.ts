import type { TRPCRouterRecord } from "@trpc/server";

import { selectSharedLocationSchema } from "@board-games/db/zodSchema";

import { protectedUserProcedure } from "../../trpc";
import { gameMatchesService } from "../../services/game/game-matches.service";
import { locationService } from "../location/service/location.service";

export const shareLocationRouter = {
  getSharedLocation: protectedUserProcedure
    .input(selectSharedLocationSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const detail = await locationService.getLocation({
        ctx,
        input: { type: "shared", sharedId: input.id },
      });
      if (detail === null || detail.type !== "shared") {
        return null;
      }
      const matches = await gameMatchesService.getLocationMatches({
        ctx,
        input: { type: "shared", sharedId: input.id },
      });
      return {
        id: detail.sharedId,
        name: detail.name,
        isDefault: detail.isDefault,
        matches,
      };
    }),
} satisfies TRPCRouterRecord;
