import type {
  Filter,
  InferQueryResult,
  QueryConfig,
  TransactionType,
} from "@board-games/db/client";
import { db } from "@board-games/db/client";
import { shareRequest } from "@board-games/db/schema";

import type { InsertShareRequestInputType } from "./sharing.repository.types";

class SharingRepository {
  public async insert(
    input: InsertShareRequestInputType,
    tx?: TransactionType,
  ) {
    const database = tx ?? db;
    const [returningShareRequest] = await database
      .insert(shareRequest)
      .values(input)
      .returning();
    return returningShareRequest;
  }
  public async get<TConfig extends QueryConfig<"shareRequest">>(
    filters: {
      ownerId: NonNullable<Filter<"shareRequest">["ownerId"]>;
      sharedWithId: NonNullable<Filter<"shareRequest">["sharedWithId"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"shareRequest", TConfig> | undefined> {
    const database = tx ?? db;
    const { ownerId, sharedWithId, ...queryConfig } = filters;
    const result = await database.query.shareRequest.findFirst({
      where: {
        ownerId,
        sharedWithId,
        ...(queryConfig.where ?? {}),
      },
      with: queryConfig.with,
      orderBy: queryConfig.orderBy,
    });
    return result as InferQueryResult<"shareRequest", TConfig> | undefined;
  }
}
export const sharingRepository = new SharingRepository();
