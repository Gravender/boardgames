import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@board-games/eslint-config/base";
import { nextjsConfig } from "@board-games/eslint-config/nextjs";
import { reactConfig } from "@board-games/eslint-config/react";

export default defineConfig(
  {
    ignores: [".next/**"],
  },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
);
