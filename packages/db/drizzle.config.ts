import { defineConfig } from "drizzle-kit";

if (!process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL is not set");
}

const postgresUrl = process.env.POSTGRES_URL;

export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: postgresUrl,
  },
  tablesFilter: ["boardgames_*"],
  verbose: true,
  strict: true,
});
