import baseConfig, { restrictEnvAccess } from "@board-games/eslint-config/base";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [],
  },
  ...baseConfig,

  ...restrictEnvAccess,
];
