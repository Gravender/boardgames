import type z from "zod";

import type { originalRoleSchema, sharedRoleSchema } from "./schema";

export type ImagePreviewType =
  | {
      type: "file";
      url: string;
    }
  | {
      type: "svg";
      name: string;
    }
  | null;
export type OriginalRole = z.infer<typeof originalRoleSchema>;
export type SharedRole = z.infer<typeof sharedRoleSchema>;
