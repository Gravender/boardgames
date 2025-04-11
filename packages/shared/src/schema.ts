import { z } from "zod";

import {
  insertRoundSchema,
  insertScoreSheetSchema,
} from "@board-games/db/zodSchema";

export const baseGameSchema = z.object({
  name: z.string().min(1, {
    message: "Game name is required",
  }),
  ownedBy: z.boolean(),
  gameImg: z
    .instanceof(File)
    .refine((file) => file.size <= 4000000, `Max image size is 4MB.`)
    .refine(
      (file) => file.type === "image/jpeg" || file.type === "image/png",
      "Only .jpg and .png formats are supported.",
    )
    .nullable(),
  playersMin: z.number().min(1).nullable(),
  playersMax: z.number().positive().nullable(),
  playtimeMin: z.number().min(1).positive().nullable(),
  playtimeMax: z.number().positive().nullable(),
  yearPublished: z.number().min(1900).max(new Date().getFullYear()).nullable(),
});
export const createGameSchema = baseGameSchema
  .omit({ gameImg: true })
  .extend({
    gameImg: z
      .instanceof(File)
      .refine((file) => file.size <= 4000000, `Max image size is 4MB.`)
      .refine(
        (file) => file.type === "image/jpeg" || file.type === "image/png",
        "Only .jpg and .png formats are supported.",
      )
      .nullable(),
  })
  .superRefine((values, ctx) => {
    if (
      values.playersMin &&
      values.playersMax &&
      values.playersMin > values.playersMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Players min must be less than or equal to players max.",
        path: ["playersMin"],
      });
    }
    if (
      values.playtimeMin &&
      values.playtimeMax &&
      values.playtimeMin > values.playtimeMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Playtime min must be less than or equal to playtime max.",
        path: ["playtimeMin"],
      });
    }
  });

export const editGameSchema = baseGameSchema
  .omit({ gameImg: true })
  .extend({
    imageUrl: z
      .instanceof(File)
      .refine((file) => file.size <= 4000000, `Max image size is 4MB.`)
      .refine(
        (file) => file.type === "image/jpeg" || file.type === "image/png",
        "Only .jpg and .png formats are supported.",
      )
      .or(z.string().nullable()),
  })
  .superRefine((values, ctx) => {
    if (
      values.playersMin &&
      values.playersMax &&
      values.playersMin > values.playersMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Players min must be less than or equal to players max.",
        path: ["playersMin"],
      });
    }
    if (
      values.playtimeMin &&
      values.playtimeMax &&
      values.playtimeMin > values.playtimeMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Playtime min must be less than or equal to playtime max.",
        path: ["playtimeMin"],
      });
    }
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
