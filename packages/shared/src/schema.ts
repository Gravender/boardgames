import { z } from "zod/v4";

import {
  insertImageSchema,
  insertRoundSchema,
  insertScoreSheetSchema,
} from "@board-games/db/zodSchema";

const nonNullFileSchema = z
  .file()
  .max(4_000_000, {
    error: (issue) => {
      return { ...issue, message: "Image file size must be less than 4MB" };
    },
  })
  .mime(["image/jpeg", "image/png"], {
    error: (issue) => {
      return {
        ...issue,
        message: "Invalid image file type - must be a .jpg or .png",
      };
    },
  });
export const fileSchema = nonNullFileSchema.nullable();
export const baseGameSchema = z
  .object({
    name: z.string().min(1, {
      message: "Game name is required",
    }),
    ownedBy: z.boolean(),
    gameImg: fileSchema,
    playersMin: z.number().min(1).nullable(),
    playersMax: z.number().positive().nullable(),
    playtimeMin: z.number().min(1).positive().nullable(),
    playtimeMax: z.number().positive().nullable(),
    yearPublished: z
      .number()
      .min(1900)
      .max(new Date().getFullYear())
      .nullable(),
  })
  .check((ctx) => {
    if (
      ctx.value.playersMin &&
      ctx.value.playersMax &&
      ctx.value.playersMin > ctx.value.playersMax
    ) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        message: "Players min must be less than or equal to players max.",
        path: ["playersMin"],
      });
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        message: "Playtime max must be greater than or equal to playtime min.",
        path: ["playtimeMax"],
      });
    }
    if (
      ctx.value.playtimeMin &&
      ctx.value.playtimeMax &&
      ctx.value.playtimeMin > ctx.value.playtimeMax
    ) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        message: "Playtime min must be less than or equal to playtime max.",
        path: ["playtimeMin"],
      });
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        message: "Playtime max must be greater than or equal to playtime min.",
        path: ["playtimeMax"],
      });
    }
  });
export const createGameSchema = baseGameSchema.omit({ gameImg: true }).extend({
  gameImg: z
    .discriminatedUnion("type", [
      z.object({
        type: z.literal("file"),
        file: nonNullFileSchema,
      }),
      z.object({
        type: z.literal("svg"),
        name: z.string().min(1, {
          message: "SVG name is required",
        }),
      }),
    ])
    .nullable(),
});

export const editGameSchema = baseGameSchema.omit({ gameImg: true }).extend({
  gameImg: z
    .discriminatedUnion("type", [
      z.object({
        type: z.literal("file"),
        file: nonNullFileSchema.or(z.string()),
      }),
      z.object({
        type: z.literal("svg"),
        name: z.string().min(1, {
          message: "SVG name is required",
        }),
      }),
    ])
    .nullable(),
});
export const sharedEditGameSchema = baseGameSchema.omit({
  gameImg: true,
  ownedBy: true,
});

export const scoreSheetSchema = insertScoreSheetSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    userId: true,
    type: true,
    gameId: true,
  })
  .required({ name: true, isCoop: true });
export const editScoresheetSchema = scoreSheetSchema.extend({
  isDefault: z.boolean().optional(),
});

export const baseRoundSchema = insertRoundSchema
  .pick({
    name: true,
    type: true,
    order: true,
    score: true,
    color: true,
    lookup: true,
    modifier: true,
  })
  .required({ name: true });
export const roundSchema = baseRoundSchema.extend({
  roundId: z.number().nullable(),
});

export const roundsSchema = z.array(roundSchema);

export const imageSchema = insertImageSchema
  .pick({
    name: true,
    url: true,
    type: true,
    usageType: true,
  })
  .required({ name: true, url: true });
