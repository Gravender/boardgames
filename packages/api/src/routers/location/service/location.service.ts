import { TRPCError } from "@trpc/server";

import { db } from "@board-games/db/client";

import { locationRepository } from "../../../repositories/location/location.repository";
import type {
  CreateLocationOutputType,
  GetLocationOutputType,
  GetLocationsOutputType,
} from "../location.output";
import type {
  CreateLocationArgs,
  DeleteLocationArgs,
  EditDefaultLocationArgs,
  GetLocationArgs,
  GetLocationsArgs,
  UpdateLocationArgs,
} from "./location.service.types";

class LocationService {
  public async getLocations(
    args: GetLocationsArgs,
  ): Promise<GetLocationsOutputType> {
    const response = await locationRepository.getLocations({
      userId: args.ctx.userId,
    });

    const originalLocations = response.originalLocations.map((location) => ({
      type: "original" as const,
      ...location,
      matches: location.matches.length + location.sharedMatches.length,
    }));

    const sharedLocations = response.sharedLocations.map((sharedLocation) => ({
      type: "shared" as const,
      sharedId: sharedLocation.id,
      name: sharedLocation.location.name,
      isDefault: sharedLocation.isDefault,
      permission: sharedLocation.permission,
      matches: sharedLocation.sharedMatches.length,
    }));
    const combinedLocations = [...originalLocations, ...sharedLocations];
    combinedLocations.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });

    return combinedLocations;
  }

  public async getLocation(
    args: GetLocationArgs,
  ): Promise<GetLocationOutputType> {
    const { ctx, input } = args;
    if (input.type === "original") {
      const result = await locationRepository.getOriginalLocationSummary({
        userId: ctx.userId,
        locationId: input.id,
      });
      if (!result) {
        return null;
      }
      return {
        type: "original",
        id: result.id,
        name: result.name,
        isDefault: result.isDefault,
      };
    }

    const returnedLocation = await locationRepository.getSharedLocationSummary({
      userId: ctx.userId,
      sharedLocationId: input.sharedId,
    });
    if (!returnedLocation) {
      return null;
    }
    return {
      type: "shared",
      sharedId: returnedLocation.id,
      permission: returnedLocation.permission,
      name: returnedLocation.location.name,
      isDefault: returnedLocation.isDefault,
    };
  }

  public async create(
    args: CreateLocationArgs,
  ): Promise<CreateLocationOutputType> {
    const result = await locationRepository.createLocationWithDefaultHandling({
      userId: args.ctx.userId,
      name: args.input.name,
      isDefault: args.input.isDefault ?? false,
    });
    if (!result) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
    return result;
  }

  public async update(args: UpdateLocationArgs): Promise<void> {
    const { ctx, input } = args;
    await db.transaction(async (tx) => {
      if (input.type === "original") {
        const ok = await locationRepository.updateOriginalLocationName({
          userId: ctx.userId,
          locationId: input.id,
          name: input.name,
          tx,
        });
        if (!ok) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Location not found.",
          });
        }
        return;
      }
      const sharedLocation = await locationRepository.findSharedLocationForUser(
        {
          userId: ctx.userId,
          sharedLocationId: input.sharedId,
          tx,
        },
      );
      if (!sharedLocation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared location not found.",
        });
      }
      if (sharedLocation.permission !== "edit") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to edit this location.",
        });
      }
      await locationRepository.updateLocationNameById({
        locationId: sharedLocation.locationId,
        name: input.name,
        tx,
      });
    });
  }

  public async editDefaultLocation(
    args: EditDefaultLocationArgs,
  ): Promise<void> {
    const { ctx, input } = args;
    await db.transaction(async (tx) => {
      if (input.type === "original") {
        const loc = await locationRepository.findOriginalLocationForUser({
          userId: ctx.userId,
          locationId: input.id,
          tx,
        });
        if (!loc) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Location not found.",
          });
        }
      } else {
        const sl = await locationRepository.findSharedLocationForUser({
          userId: ctx.userId,
          sharedLocationId: input.sharedId,
          tx,
        });
        if (!sl) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared location not found.",
          });
        }
      }
      const applied = await locationRepository.applyDefaultLocationToggle({
        userId: ctx.userId,
        input,
        tx,
      });
      if (!applied) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            input.type === "original"
              ? "Location not found."
              : "Shared location not found.",
        });
      }
    });
  }

  public async deleteLocation(args: DeleteLocationArgs): Promise<void> {
    const { ctx, input } = args;
    await db.transaction(async (tx) => {
      if (input.type === "original") {
        const row = await locationRepository.softDeleteOriginalLocation({
          userId: ctx.userId,
          locationId: input.id,
          tx,
        });
        if (!row) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Location not found.",
          });
        }
        return;
      }
      const deleted = await locationRepository.deleteSharedLocationForRecipient(
        {
          userId: ctx.userId,
          sharedLocationId: input.sharedId,
          tx,
        },
      );
      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared location not found.",
        });
      }
    });
  }
}

export const locationService = new LocationService();
