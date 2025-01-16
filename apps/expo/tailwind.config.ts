import type { Config } from "tailwindcss";
// @ts-expect-error - no types
import nativewind from "nativewind/preset";

import baseConfig from "@board-games/tailwind-config/native";

const { hairlineWidth } = require("nativewind/theme");

export default {
  content: [
    "./src/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./node_modules/@rnr/**/*.{ts,tsx}",
  ],
  presets: [baseConfig, nativewind],
  theme: {
    extend: {
      borderWidth: {
        hairline: hairlineWidth(),
      },
    },
  },
} satisfies Config;
