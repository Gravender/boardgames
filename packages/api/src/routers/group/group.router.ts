import type { TRPCRouterRecord } from "@trpc/server";

import { protectedUserProcedure } from "../../trpc";
import {
  createGroupInput,
  deleteGroupInput,
  getGroupInput,
  updateGroupInput,
} from "./group.input";
import {
  getGroupOutput,
  getGroupsOutput,
  getGroupWithPlayersOutput,
  updateGroupOutput,
} from "./group.output";
import { groupService } from "./service/group.service";

export const groupRouter = {
  getGroups: protectedUserProcedure
    .output(getGroupsOutput)
    .query(async ({ ctx }) => groupService.getGroups({ ctx })),

  getGroupsWithPlayers: protectedUserProcedure
    .output(getGroupWithPlayersOutput)
    .query(async ({ ctx }) => groupService.getGroupsWithPlayers({ ctx })),

  getGroup: protectedUserProcedure
    .input(getGroupInput)
    .output(getGroupOutput)
    .query(async ({ ctx, input }) =>
      groupService.getGroup({ ctx, id: input.id }),
    ),

  create: protectedUserProcedure
    .input(createGroupInput)
    .mutation(async ({ ctx, input }) => {
      await groupService.createGroup({
        ctx,
        name: input.name,
        players: input.players,
      });
    }),

  update: protectedUserProcedure
    .input(updateGroupInput)
    .output(updateGroupOutput)
    .mutation(async ({ ctx, input }) =>
      groupService.updateGroup({
        ctx,
        id: input.id,
        name: input.name,
        players: input.players,
      }),
    ),

  deleteGroup: protectedUserProcedure
    .input(deleteGroupInput)
    .mutation(async ({ ctx, input }) => {
      await groupService.deleteGroup({ ctx, id: input.id });
    }),
} satisfies TRPCRouterRecord;
