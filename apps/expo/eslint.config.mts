import { defineConfig } from "eslint/config";

import { baseConfig } from "@board-games/eslint-config/base";
import { reactConfig } from "@board-games/eslint-config/react";

export default defineConfig(
  {
    ignores: [".expo/**", "expo-plugins/**"],
  },
  baseConfig,
  reactConfig,
);
