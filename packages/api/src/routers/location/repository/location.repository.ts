import { db } from "@board-games/db/client";

import type { GetLocationsArgs } from "./location.repository.types";

class LocationRepository {
  public async getLocations(args: GetLocationsArgs) {
    const originalLocations = await db.query.location.findMany({
      where: {
        createdBy: args.userId,
        deletedAt: {
          isNull: true,
        },
      },
      columns: {
        id: true,
        name: true,
        isDefault: true,
      },
      with: {
        matches: {
          columns: {
            id: true,
          },
        },
        sharedMatches: {
          where: {
            sharedWithId: args.userId,
          },
          columns: {
            id: true,
          },
        },
      },
    });
    const sharedLocations = await db.query.sharedLocation.findMany({
      where: {
        sharedWithId: args.userId,
        linkedLocationId: {
          isNull: true,
        },
      },
      columns: {
        id: true,
        isDefault: true,
        permission: true,
      },
      with: {
        sharedMatches: {
          where: {
            sharedWithId: args.userId,
          },
          columns: {
            id: true,
          },
        },
        location: {
          columns: {
            id: true,
            name: true,
            isDefault: true,
          },
        },
      },
    });
    return {
      originalLocations,
      sharedLocations,
    };
  }
}

export const locationRepository = new LocationRepository();
