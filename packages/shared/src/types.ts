import type z from "zod";

import type {
  gameImageSchema,
  imageSchema,
  originalRoleSchema,
  playerImageSchema,
  sharedRoleSchema,
} from "./schema";

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

export type ImageWithUsage = z.infer<typeof imageSchema>;
export type PlayerImage = z.infer<typeof playerImageSchema>;
export type GameImage = z.infer<typeof gameImageSchema>;

/**
 * Image row joined from the DB (includes `id`). `url` may be null when not yet
 * resolved to a public URL.
 */
export type ImageRowWithUsage = { id: number } & Omit<ImageWithUsage, "url"> & {
    url: string | null;
  };
