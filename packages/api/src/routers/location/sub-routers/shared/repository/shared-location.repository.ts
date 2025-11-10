import { TRPCError } from "@trpc/server";

import { db } from "@board-games/db/client";

import type { GetSharedLocationsWithUserArgs } from "./shared-location.repository.types";

class SharedLocationRepository {
  public async getSharedLocationsFromSharedMatch(
    args: GetSharedLocationsWithUserArgs,
  ) {
    const sharedMatch = await db.query.sharedMatch.findFirst({
      where: {
        id: args.input.sharedMatchId,
        sharedWithId: args.userId,
      },
      columns: {
        ownerId: true,
      },
    });

    if (!sharedMatch) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Shared match not found.",
      });
    }

    const locations = await db.query.sharedLocation.findMany({
      where: {
        ownerId: sharedMatch.ownerId,
        sharedWithId: args.userId,
      },
      columns: {
        id: true,
        permission: true,
        isDefault: true,
      },
      with: {
        location: {
          columns: {
            name: true,
          },
        },
      },
    });

    return {
      locations,
    };
  }
}

export const sharedLocationRepository = new SharedLocationRepository();
