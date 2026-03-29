import type { TRPCRouterRecord } from "@trpc/server";

import { gameMatchesService } from "../../services/game/game-matches.service";
import { protectedUserProcedure } from "../../trpc";
import { getGameMatchesOutput } from "../game/game.output";
import {
  createLocationInput,
  deleteLocationInput,
  editDefaultLocationInput,
  getLocationInput,
  updateLocationInput,
} from "./location.input";
import {
  createLocationOutput,
  getLocationOutput,
  getLocationsOutput,
} from "./location.output";
import { locationService } from "./service/location.service";
import { locationSharedRouter } from "./sub-routers/shared/shared-location.router";

export const locationRouter = {
  getLocations: protectedUserProcedure
    .output(getLocationsOutput)
    .query(async ({ ctx }) => {
      return locationService.getLocations({
        ctx,
      });
    }),
  getLocation: protectedUserProcedure
    .input(getLocationInput)
    .output(getLocationOutput)
    .query(async ({ ctx, input }) => {
      return locationService.getLocation({
        ctx,
        input,
      });
    }),
  getLocationMatches: protectedUserProcedure
    .input(getLocationInput)
    .output(getGameMatchesOutput)
    .query(async ({ ctx, input }) => {
      return gameMatchesService.getLocationMatches({
        ctx,
        input,
      });
    }),
  create: protectedUserProcedure
    .input(createLocationInput)
    .output(createLocationOutput)
    .mutation(async ({ ctx, input }) => {
      return locationService.create({
        ctx,
        input,
      });
    }),
  update: protectedUserProcedure
    .input(updateLocationInput)
    .mutation(async ({ ctx, input }) => {
      await locationService.update({
        ctx,
        input,
      });
    }),
  editDefaultLocation: protectedUserProcedure
    .input(editDefaultLocationInput)
    .mutation(async ({ ctx, input }) => {
      await locationService.editDefaultLocation({
        ctx,
        input,
      });
    }),
  deleteLocation: protectedUserProcedure
    .input(deleteLocationInput)
    .mutation(async ({ ctx, input }) => {
      await locationService.deleteLocation({
        ctx,
        input,
      });
    }),
  shared: locationSharedRouter,
} satisfies TRPCRouterRecord;
