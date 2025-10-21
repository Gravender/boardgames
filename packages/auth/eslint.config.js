import baseConfig, { restrictEnvAccess } from "@board-games/eslint-config/base";
import reactConfig from "@board-games/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: ["script/**"],
  },
  ...baseConfig,
  ...reactConfig,
  ...restrictEnvAccess,
];
