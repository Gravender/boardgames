import { z } from "zod/v4";
import { createStore } from "zustand/vanilla";

import {
  insertRoundSchema,
  insertScoreSheetSchema,
} from "@board-games/db/zodSchema";
import { fileSchema } from "@board-games/shared";

export const scoreSheetSchema = insertScoreSheetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
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
    gameImg: fileSchema.or(z.string().nullable()),
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
