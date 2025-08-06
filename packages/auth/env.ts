import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export function authEnv() {
  return createEnv({
    server: {
      AUTH_GITHUB_CLIENT_ID: z.string().min(1),
      AUTH_GITHUB_CLIENT_SECRET: z.string().min(1),
      AUTH_GOOGLE_CLIENT_ID: z.string().min(1),
      AUTH_GOOGLE_CLIENT_SECRET: z.string().min(1),
      AUTH_SECRET:
        process.env.NODE_ENV === "production"
          ? z.string().min(1)
          : z.string().min(1).optional(),
      NODE_ENV: z.enum(["development", "production"]).optional(),
      RESEND_API_KEY: z.string().min(1),
    },
    experimental__runtimeEnv: {},
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === "lint",
  });
}
