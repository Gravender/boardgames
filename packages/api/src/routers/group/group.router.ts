import type { TRPCRouterRecord } from "@trpc/server";

import { protectedUserProcedure } from "../../trpc";
import { getGroupWithPlayers } from "./group.output";
import { groupService } from "./service/group.service";

export const groupRouter = {
  getGroupsWithPlayers: protectedUserProcedure
    .output(getGroupWithPlayers)
    .query(async ({ ctx }) => {
      return groupService.getGroupsWithPlayers({
        ctx,
      });
    }),
} satisfies TRPCRouterRecord;
