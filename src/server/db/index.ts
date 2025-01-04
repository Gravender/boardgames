import { sql } from "@vercel/postgres";
import { drizzle as LocalDrizzle } from "drizzle-orm/postgres-js";
import { drizzle as VercelDrizzle } from "drizzle-orm/vercel-postgres";
import postgres from "postgres";

import { env } from "~/env";

import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn = globalForDb.conn ?? postgres(env.POSTGRES_URL);
globalForDb.conn = conn;

export const db =
  env.NODE_ENV === "development"
    ? LocalDrizzle(conn, { schema, logger: true })
    : VercelDrizzle(sql, { schema });
