import { eq } from "drizzle-orm";

import type {
  Filter,
  InferQueryResult,
  QueryConfig,
  TransactionType,
} from "@board-games/db/client";
import { db } from "@board-games/db/client";
import { location, sharedLocation } from "@board-games/db/schema";

import type {
  GetLocationsArgs,
  InsertLocationInputType,
  InsertSharedLocationInputType,
  LinkedSharedLocationArgs,
} from "./location.repository.types";

class LocationRepository {
  public async insert(input: InsertLocationInputType, tx?: TransactionType) {
    const database = tx ?? db;
    const [returningLocation] = await database
      .insert(location)
      .values(input)
      .returning();
    return returningLocation;
  }
  public async insertShared(
    input: InsertSharedLocationInputType,
    tx?: TransactionType,
  ) {
    const database = tx ?? db;
    const [returningLocation] = await database
      .insert(sharedLocation)
      .values(input)
      .returning();
    return returningLocation;
  }
  public async get<TConfig extends QueryConfig<"location">>(
    filters: {
      id: NonNullable<Filter<"location">["id"]>;
      createdBy: NonNullable<Filter<"location">["createdBy"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"location", TConfig> | undefined> {
    const database = tx ?? db;
    const { id, createdBy, ...queryConfig } = filters;
    const result = await database.query.location.findFirst({
      where: {
        id: id,
        createdBy: createdBy,
        deletedAt: {
          isNull: true,
        },
        ...(queryConfig.where ?? {}),
      },
      with: queryConfig.with,
      orderBy: queryConfig.orderBy,
    });
    return result as InferQueryResult<"location", TConfig> | undefined;
  }
  //TODO - fix the type inference for default with location is true
  public async getShared<TConfig extends QueryConfig<"sharedLocation">>(
    filters: {
      id: NonNullable<Filter<"sharedLocation">["id"]>;
      sharedWithId: NonNullable<Filter<"sharedLocation">["sharedWithId"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"sharedLocation", TConfig> | undefined> {
    const database = tx ?? db;
    const { id, sharedWithId, ...queryConfig } = filters;
    const result = await database.query.sharedLocation.findFirst({
      where: {
        id: id,
        sharedWithId: sharedWithId,
        linkedLocationId: {
          isNull: true,
        },
        ...(queryConfig.where ?? {}),
      },
      with: {
        location: true,
        ...(queryConfig.with ?? {}),
      },
      orderBy: queryConfig.orderBy,
    });
    return result as InferQueryResult<"sharedLocation", TConfig> | undefined;
  }
  public async getSharedByLocationId<
    TConfig extends QueryConfig<"sharedLocation">,
  >(
    filters: {
      locationId: NonNullable<Filter<"sharedLocation">["locationId"]>;
      sharedWithId: NonNullable<Filter<"sharedLocation">["sharedWithId"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"sharedLocation", TConfig> | undefined> {
    const database = tx ?? db;
    const { locationId, sharedWithId, ...queryConfig } = filters;
    const result = await database.query.sharedLocation.findFirst({
      where: {
        locationId: locationId,
        sharedWithId: sharedWithId,
        linkedLocationId: {
          isNull: true,
        },
        ...(queryConfig.where ?? {}),
      },
      with: {
        location: true,
        ...(queryConfig.with ?? {}),
      },
      orderBy: queryConfig.orderBy,
    });
    return result as InferQueryResult<"sharedLocation", TConfig> | undefined;
  }
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
  public async linkSharedLocation(args: LinkedSharedLocationArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [linkedLocation] = await database
      .update(sharedLocation)
      .set({
        id: input.sharedLocationId,
        linkedLocationId: input.linkedLocationId,
      })
      .where(eq(sharedLocation.id, input.sharedLocationId))
      .returning();
    return linkedLocation;
  }
}

export const locationRepository = new LocationRepository();
