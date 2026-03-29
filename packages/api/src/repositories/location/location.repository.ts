import { and, eq, isNull } from "drizzle-orm";

import type {
  Filter,
  InferQueryResult,
  QueryConfig,
  TransactionType,
} from "@board-games/db/client";
import { db } from "@board-games/db/client";
import {
  location,
  match,
  sharedLocation,
  sharedMatch,
  shareRequest,
} from "@board-games/db/schema";

import type {
  ClearUserLocationDefaultsArgs,
  DeleteSharedLocationRowArgs,
  GetLocationsArgs,
  InsertLocationInputType,
  InsertSharedLocationInputType,
  LinkedSharedLocationArgs,
  SoftDeleteOriginalLocationArgs,
  UpdateLocationNameByIdArgs,
  UpdateOriginalLocationNameArgs,
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
    const where = {
      ...(queryConfig.where as QueryConfig<"location">["where"]),
      id: id,
      createdBy: createdBy,
      deletedAt: {
        isNull: true,
      },
    } satisfies QueryConfig<"location">["where"];
    const result = await database.query.location.findFirst({
      where,
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
    const where = {
      ...(queryConfig.where as QueryConfig<"sharedLocation">["where"]),
      id: id,
      sharedWithId: sharedWithId,
      linkedLocationId: {
        isNull: true,
      },
    } satisfies QueryConfig<"sharedLocation">["where"];
    const withConfig = {
      ...(queryConfig.with as QueryConfig<"sharedLocation">["with"]),
      location: true,
    } as QueryConfig<"sharedLocation">["with"];
    const result = await database.query.sharedLocation.findFirst({
      where,
      with: withConfig,
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
    const where = {
      ...(queryConfig.where as QueryConfig<"sharedLocation">["where"]),
      locationId: locationId,
      sharedWithId: sharedWithId,
      linkedLocationId: {
        isNull: true,
      },
    } as QueryConfig<"sharedLocation">["where"];
    const withConfig = {
      ...(queryConfig.with as QueryConfig<"sharedLocation">["with"]),
      location: true,
    } satisfies QueryConfig<"sharedLocation">["with"];
    const result = await database.query.sharedLocation.findFirst({
      where,
      with: withConfig,
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
        linkedLocationId: input.linkedLocationId,
      })
      .where(eq(sharedLocation.id, input.sharedLocationId))
      .returning();
    return linkedLocation;
  }

  public async getOriginalLocationSummary(args: {
    userId: string;
    locationId: number;
  }) {
    return db.query.location.findFirst({
      where: {
        id: args.locationId,
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
    });
  }

  public async getSharedLocationSummary(args: {
    userId: string;
    sharedLocationId: number;
  }) {
    return db.query.sharedLocation.findFirst({
      where: {
        id: args.sharedLocationId,
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
        location: {
          columns: {
            name: true,
          },
        },
      },
    });
  }

  public async clearUserLocationDefaults(args: ClearUserLocationDefaultsArgs) {
    const { userId, tx } = args;
    await tx
      .update(location)
      .set({ isDefault: false })
      .where(eq(location.createdBy, userId));
    await tx
      .update(sharedLocation)
      .set({ isDefault: false })
      .where(eq(sharedLocation.sharedWithId, userId));
  }

  public async createLocationWithDefaultHandling(input: {
    userId: string;
    name: string;
    isDefault: boolean;
  }) {
    return db.transaction(async (transaction) => {
      if (input.isDefault) {
        await this.clearUserLocationDefaults({
          userId: input.userId,
          tx: transaction,
        });
      }
      const [row] = await transaction
        .insert(location)
        .values({
          name: input.name,
          isDefault: input.isDefault,
          createdBy: input.userId,
        })
        .returning();
      return row;
    });
  }

  public async updateOriginalLocationName(
    args: UpdateOriginalLocationNameArgs,
  ) {
    const { userId, locationId, name, tx } = args;
    const updated = await tx
      .update(location)
      .set({ name })
      .where(and(eq(location.id, locationId), eq(location.createdBy, userId)))
      .returning({ id: location.id });
    return updated.length > 0;
  }

  public async updateLocationNameById(args: UpdateLocationNameByIdArgs) {
    const { locationId, name, tx } = args;
    await tx.update(location).set({ name }).where(eq(location.id, locationId));
  }

  public async applyDefaultLocationToggle(args: {
    userId: string;
    input:
      | { type: "original"; id: number; isDefault: boolean }
      | { type: "shared"; sharedId: number; isDefault: boolean };
    tx: TransactionType;
  }): Promise<boolean> {
    const { userId, input, tx } = args;
    await this.clearUserLocationDefaults({ userId, tx });
    if (input.type === "original") {
      const updated = await tx
        .update(location)
        .set({ isDefault: input.isDefault })
        .where(and(eq(location.id, input.id), eq(location.createdBy, userId)))
        .returning({ id: location.id });
      return updated.length > 0;
    }
    const updated = await tx
      .update(sharedLocation)
      .set({ isDefault: input.isDefault })
      .where(
        and(
          eq(sharedLocation.id, input.sharedId),
          eq(sharedLocation.sharedWithId, userId),
          isNull(sharedLocation.linkedLocationId),
        ),
      )
      .returning({ id: sharedLocation.id });
    return updated.length > 0;
  }

  public async softDeleteOriginalLocation(
    args: SoftDeleteOriginalLocationArgs,
  ) {
    const { userId, locationId, tx } = args;
    const existing = await tx.query.location.findFirst({
      where: {
        id: locationId,
        createdBy: userId,
        deletedAt: { isNull: true },
      },
      columns: { id: true },
    });
    if (!existing) {
      return null;
    }
    await tx
      .update(sharedLocation)
      .set({ linkedLocationId: null })
      .where(eq(sharedLocation.linkedLocationId, locationId));
    await tx
      .update(match)
      .set({ locationId: null })
      .where(eq(match.locationId, locationId));
    const [row] = await tx
      .update(location)
      .set({ deletedAt: new Date() })
      .where(and(eq(location.id, locationId), eq(location.createdBy, userId)))
      .returning({ id: location.id });
    return row ?? null;
  }

  public async deleteSharedLocationForRecipient(
    args: DeleteSharedLocationRowArgs,
  ) {
    const { userId, sharedLocationId, tx } = args;
    await tx
      .update(sharedMatch)
      .set({ sharedLocationId: null })
      .where(eq(sharedMatch.sharedLocationId, sharedLocationId));
    const [deletedLocation] = await tx
      .delete(sharedLocation)
      .where(
        and(
          eq(sharedLocation.id, sharedLocationId),
          eq(sharedLocation.sharedWithId, userId),
        ),
      )
      .returning();
    if (deletedLocation) {
      await tx
        .update(shareRequest)
        .set({
          status: "rejected",
        })
        .where(
          and(
            eq(shareRequest.sharedWithId, userId),
            eq(shareRequest.itemType, "location"),
            eq(shareRequest.itemId, deletedLocation.id),
            eq(shareRequest.status, "accepted"),
          ),
        );
    }
    return deletedLocation;
  }

  public async findSharedLocationForUser(args: {
    userId: string;
    sharedLocationId: number;
    tx?: TransactionType;
  }) {
    const database = args.tx ?? db;
    return database.query.sharedLocation.findFirst({
      where: {
        id: args.sharedLocationId,
        sharedWithId: args.userId,
        linkedLocationId: {
          isNull: true,
        },
      },
    });
  }

  public async findOriginalLocationForUser(args: {
    userId: string;
    locationId: number;
    tx?: TransactionType;
  }) {
    const database = args.tx ?? db;
    return database.query.location.findFirst({
      where: {
        id: args.locationId,
        createdBy: args.userId,
        deletedAt: { isNull: true },
      },
      columns: { id: true },
    });
  }
}

export const locationRepository = new LocationRepository();
