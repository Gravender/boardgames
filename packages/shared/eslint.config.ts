import type { Linter } from "eslint";
import { defineConfig } from "eslint/config";

import { baseConfig } from "@board-games/eslint-config/base";
import { reactConfig } from "@board-games/eslint-config/react";

const config = defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  reactConfig,
) satisfies Linter.Config[];

const typedConfig = config as Linter.Config[];

export default typedConfig;
