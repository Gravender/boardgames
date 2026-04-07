import { z } from "zod/v4";

export const shareMessageOutput = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const requestShareGameOutput = z.object({
  success: z.boolean(),
  message: z.string(),
  shareableUrl: z.string().optional(),
  shareMessages: z.array(shareMessageOutput).optional(),
});

export type RequestShareGameOutputType = z.infer<typeof requestShareGameOutput>;
