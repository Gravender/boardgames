import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      "@": path.resolve(__dirname, "./src"),
      "@board-games/ui/components/button-variants": path.resolve(
        __dirname,
        "../../packages/ui/src/components/button-variants.ts",
      ),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
