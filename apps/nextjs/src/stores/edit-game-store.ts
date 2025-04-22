import { z } from "zod";
import { createStore } from "zustand/vanilla";

import {
  insertRoundSchema,
  insertScoreSheetSchema,
} from "@board-games/db/zodSchema";

export const scoreSheetSchema = insertScoreSheetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  type: true,
  gameId: true,
});
export type ScoreSheetType = z.infer<typeof scoreSheetSchema>;
export const roundsSchema = z.array(
  insertRoundSchema
    .omit({
      createdAt: true,
      updatedAt: true,
      scoresheetId: true,
    })
    .required({ id: true }),
);
export type RoundsType = z.infer<typeof roundsSchema>;

export const editGameSchema = z
  .object({
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
      .or(z.string().nullable()),
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
export type EditGameType = z.infer<typeof editGameSchema>;
export const editGameSchemaWithScoresheet = z.object({
  gameId: z.number(),
  moreOptions: z.boolean(),
  game: editGameSchema.nullable(),
  scoresheetChanged: z.boolean(),
  scoresheet: scoreSheetSchema.or(z.null()),
  rounds: roundsSchema,
});
export type EditGameState = z.infer<typeof editGameSchemaWithScoresheet>;

export interface EditGameActions {
  setGameId: (gameId: number) => void;
  setGame: (game: EditGameType) => void;
  setRounds: (rounds: RoundsType) => void;
  setScoreSheet: (scoreSheet: ScoreSheetType) => void;
  setScoresheetChanged: (scoresheetChanged: boolean) => void;
  setMoreOptions: (moreOptions: boolean) => void;
  reset: () => void;
}

export type EditGameStore = EditGameState & EditGameActions;

export const defaultInitState: EditGameState = {
  gameId: 0,
  moreOptions: false,
  game: null,
  scoresheetChanged: false,
  scoresheet: null,
  rounds: [],
};

export const createEditGameStore = (
  initState: EditGameState = defaultInitState,
) => {
  return createStore<EditGameStore>()((set) => ({
    ...initState,
    setGameId: (gameId: number) => set(() => ({ gameId: gameId })),
    setGame: (game: EditGameType) => set(() => ({ game: game })),
    setRounds: (rounds: RoundsType) => set(() => ({ rounds: rounds })),
    setScoreSheet: (scoreSheet: ScoreSheetType) =>
      set(() => ({ scoresheet: scoreSheet })),
    setScoresheetChanged: (scoresheetChanged: boolean) =>
      set(() => ({ scoresheetChanged: scoresheetChanged })),
    setMoreOptions: (moreOptions: boolean) =>
      set(() => ({ moreOptions: moreOptions })),
    reset: () => set(defaultInitState),
  }));
};
