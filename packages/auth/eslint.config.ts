import { Linter } from "eslint";
import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@board-games/eslint-config/base";
import { reactConfig } from "@board-games/eslint-config/react";

const config = defineConfig(
  {
    ignores: ["script/**"],
  },
  baseConfig,
  restrictEnvAccess,
  reactConfig,
) satisfies Linter.Config[];
const typedConfig = config as Linter.Config[];

export default typedConfig;
