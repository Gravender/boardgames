import type {
  Filter,
  InferQueryResult,
  QueryConfig,
  TransactionType,
} from "@board-games/db/client";
import { db } from "@board-games/db/client";
import { image } from "@board-games/db/schema";
import { eq } from "drizzle-orm";

class ImageRepository {
  public async findFirst<TConfig extends QueryConfig<"image">>(
    filters: {
      name?: string;
      type?: "file" | "svg";
      usageType?: "game" | "match" | "player";
      id?: number;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"image", TConfig> | undefined> {
    const database = tx ?? db;
    const { name, type, usageType, id, ...queryConfig } = filters;
    const where: Record<string, unknown> = {};
    if (name !== undefined) {
      where.name = name;
    }
    if (type !== undefined) {
      where.type = type;
    }
    if (usageType !== undefined) {
      where.usageType = usageType;
    }
    if (id !== undefined) {
      where.id = id;
    }
    const result = await database.query.image.findFirst({
      ...(queryConfig as unknown as TConfig),
      where: {
        ...where,
        ...(queryConfig as unknown as TConfig).where,
      },
    });
    return result as InferQueryResult<"image", TConfig> | undefined;
  }

  public async getById<TConfig extends QueryConfig<"image">>(
    filters: {
      id: NonNullable<Filter<"image">["id"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"image", TConfig> | undefined> {
    const database = tx ?? db;
    const { id, ...queryConfig } = filters;
    const result = await database.query.image.findFirst({
      ...(queryConfig as unknown as TConfig),
      where: {
        id,
        ...(queryConfig as unknown as TConfig).where,
      },
    });
    return result as InferQueryResult<"image", TConfig> | undefined;
  }

  public async insert(
    input: {
      type: "file" | "svg";
      name: string;
      usageType: "game" | "match" | "player";
      createdBy?: string;
      url?: string | null;
      fileId?: string | null;
      fileSize?: number | null;
    },
    tx?: TransactionType,
  ) {
    const database = tx ?? db;
    const [returnedImage] = await database
      .insert(image)
      .values(input)
      .returning();
    return returnedImage;
  }
}

export const imageRepository = new ImageRepository();

