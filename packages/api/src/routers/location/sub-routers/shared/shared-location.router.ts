import type { TRPCRouterRecord } from "@trpc/server";

import { protectedUserProcedure } from "../../../../trpc";
import { sharedLocationService } from "./service/shared-location.service";
import { sharedLocationsFromSharedMatchInput } from "./shared-location.input";
import { getSharedLocationsFromSharedMatchOutput } from "./shared-location.output";

export const locationSharedRouter = {
  getSharedLocationsFromSharedMatch: protectedUserProcedure
    .input(sharedLocationsFromSharedMatchInput)
    .output(getSharedLocationsFromSharedMatchOutput)
    .query(async ({ ctx, input }) => {
      return sharedLocationService.getSharedLocationsFromSharedMatch({
        ctx,
        input,
      });
    }),
} satisfies TRPCRouterRecord;
