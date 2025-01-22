import { defineConfig } from "drizzle-kit";

if (!process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL is not set");
}

const postgresUrl = process.env.POSTGRES_URL;

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: postgresUrl,
  },
  tablesFilter: ["boardgames_*"],
  verbose: true,
  strict: true,
});
