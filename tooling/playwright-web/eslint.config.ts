import type { Linter } from "eslint";
import { defineConfig } from "eslint/config";

import { baseConfig } from "@board-games/eslint-config/base";

const config = defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
) satisfies Linter.Config[];

const typedConfig = config as Linter.Config[];

export default typedConfig;
