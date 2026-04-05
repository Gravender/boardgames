import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure DB/auth env (e.g. POSTGRES_URL) is loaded for Vitest workers, not only the Bun CLI wrapper.
config({
  path: path.resolve(__dirname, "../../.env"),
  quiet: true,
});

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
