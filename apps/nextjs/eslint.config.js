import baseConfig, { restrictEnvAccess } from "@board-games/eslint-config/base";
import nextjsConfig from "@board-games/eslint-config/nextjs";
import reactConfig from "@board-games/eslint-config/react";

export default [
  {
    ignores: [".next/**"],
  },
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  ...restrictEnvAccess,
];
