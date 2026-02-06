import type {
  BuildQueryResult,
  DBQueryConfig,
  RelationsFilter,
} from "drizzle-orm";
import { sql } from "@vercel/postgres";
import { drizzle as LocalDrizzle } from "drizzle-orm/node-postgres";
import { drizzle as VercelDrizzle } from "drizzle-orm/vercel-postgres";
import { Pool } from "pg";

import { relations } from "./relations";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: false,
});

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */

if (!process.env.NODE_ENV || !process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL is not set");
}

export const db =
  process.env.NODE_ENV === "development"
    ? LocalDrizzle({
        client: pool,
        relations,
        logger: true,
      })
    : VercelDrizzle(sql, { relations });
export type DatabaseType = typeof db;
type TransactionCallback = Parameters<DatabaseType["transaction"]>[0];
export type TransactionType = Parameters<TransactionCallback>[0];

/** Tables-with-relations config; typeof relations is already TablesRelationalConfig from defineRelationsPart. */
type TRSchema = typeof relations;

export type Filter<TableName extends keyof TRSchema> = RelationsFilter<
  TRSchema[TableName],
  TRSchema
>;
export type QueryConfig<TableName extends keyof TRSchema> = DBQueryConfig<
  "one" | "many",
  TRSchema,
  TRSchema[TableName]
>;

export type InferQueryResult<
  TableName extends keyof TRSchema,
  QBConfig extends QueryConfig<TableName> = object,
> = BuildQueryResult<TRSchema, TRSchema[TableName], QBConfig>;

export type ManyQueryConfig<TableName extends keyof TRSchema> = DBQueryConfig<
  "many",
  TRSchema,
  TRSchema[TableName]
>;

export type InferManyQueryResult<
  TableName extends keyof TRSchema,
  QBConfig extends ManyQueryConfig<TableName> = ManyQueryConfig<TableName>,
> = BuildQueryResult<TRSchema, TRSchema[TableName], QBConfig>[];
