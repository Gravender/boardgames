import { sql } from "@vercel/postgres";
import { drizzle as LocalDrizzle } from "drizzle-orm/postgres-js";
import { drizzle as VercelDrizzle } from "drizzle-orm/vercel-postgres";
import postgres from "postgres";

import { relations } from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

if (!process.env.NODE_ENV || !process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL is not set");
}

const conn = globalForDb.conn ?? postgres(process.env.POSTGRES_URL);
globalForDb.conn = conn;

export const db =
  process.env.NODE_ENV === "development"
    ? LocalDrizzle(conn, { relations, logger: true })
    : VercelDrizzle(sql, { relations });
