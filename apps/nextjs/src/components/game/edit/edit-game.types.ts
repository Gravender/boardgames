import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import {
  scoreSheetRoundsScore,
  scoreSheetWinConditions,
} from "@board-games/db/constants";
import {
  editGameSchema,
  roundsSchema,
  scoreSheetSchema,
} from "@board-games/shared";

import { defaultRound } from "../add/add-game.types";

// Form schema for edit game - similar structure to add game but with edit-specific fields
export const editScoresheetSchema = z.discriminatedUnion("scoresheetType", [
  z.object({
    scoresheetType: z.literal("original"),
    scoresheet: scoreSheetSchema.safeExtend({
      isDefault: z.boolean().optional(),
      id: z.number(),
    }),
    rounds: roundsSchema,
    scoreSheetChanged: z.boolean(),
    roundChanged: z.boolean(),
  }),
  z.object({
    scoresheetType: z.literal("shared"),
    sharedId: z.number(),
    permission: z.literal("view").or(z.literal("edit")),
    scoresheet: scoreSheetSchema.safeExtend({
      isDefault: z.boolean().optional(),
      id: z.number(),
    }),
    rounds: roundsSchema,
    scoreSheetChanged: z.boolean(),
    roundChanged: z.boolean(),
  }),
  z.object({
    scoresheetType: z.literal("new"),
    scoresheet: scoreSheetSchema.safeExtend({
      id: z.null(),
      isDefault: z.boolean().optional(),
    }),
    rounds: roundsSchema,
  }),
]);
export const editGameFormSchema = z.object({
  game: editGameSchema,
  scoresheets: z
    .array(editScoresheetSchema)
    .min(1)
    .check((ctx) => {
      const numberDefaultScoresheets = ctx.value.filter(
        (scoresheet) => scoresheet.scoresheet.isDefault,
      ).length;
      if (numberDefaultScoresheets > 1) {
        ctx.issues.push({
          code: "custom",
          input: ctx.value,
          message: "Only one default scoresheet is allowed.",
          path: ["isDefault"],
        });
      }
    }),
  activeScoreSheetIndex: z.number().optional(),
  activeForm: z.enum(["game", "scoresheet", "roles"]),
});

export type EditGameFormValues = z.infer<typeof editGameFormSchema>;
export type EditScoresheetForm = z.infer<typeof editScoresheetSchema>;

// Option constants for scoresheet forms
export const winConditionOptions = scoreSheetWinConditions;
export const roundsScoreOptions: (typeof scoreSheetRoundsScore)[number][] =
  scoreSheetRoundsScore.filter((option) => option !== "None");
export const manualWinConditionOptions = scoreSheetRoundsScore;
export const coopWinConditionOptions: (typeof scoreSheetWinConditions)[number][] =
  ["Manual", "Target Score"];

// Default values for edit game components
export const defaultScoresheetFormValues: EditScoresheetForm = {
  scoresheetType: "new",
  scoresheet: {
    id: null,
    name: "Default",
    winCondition: "Highest Score",
    isCoop: false,
    isDefault: false,
    roundsScore: "Aggregate",
    targetScore: 0,
  },
  rounds: [
    {
      name: "Round 1",
      type: "Numeric",
      color: "#cbd5e1",
      score: 0,
      order: 0,
      roundId: null,
    },
  ],
};

export const defaultRoundsFormValues: {
  rounds: EditScoresheetForm["rounds"];
} = {
  rounds: [
    {
      ...defaultRound,
      roundId: null,
    },
  ],
};

export const defaultRoundPopoverValues: {
  round: EditScoresheetForm["rounds"][number];
} = {
  round: {
    ...defaultRound,
    roundId: null,
  },
};

export const defaultScoresheetsFormValues: {
  scoreSheets: EditScoresheetForm[];
  activeScoreSheetIndex?: number;
} = {
  scoreSheets: [],
  activeScoreSheetIndex: 0,
};

// Transform API output to form default values
export function transformEditGameDataToFormValues(
  data: NonNullable<RouterOutputs["game"]["getEditGame"]>,
): EditGameFormValues {
  return {
    game: {
      ...data.game,
      gameImg: data.game.gameImg
        ? data.game.gameImg.type === "file"
          ? {
              type: "file" as const,
              file: data.game.gameImg.url ?? "",
            }
          : {
              type: "svg" as const,
              name: data.game.gameImg.name,
            }
        : null,
      roles: data.roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
      })),
    },
    scoresheets: data.scoresheets.map((scoresheet) => {
      if (scoresheet.scoresheetType === "original") {
        return {
          scoresheetType: "original" as const,
          scoresheet: {
            id: scoresheet.id,
            name: scoresheet.name,
            winCondition: scoresheet.winCondition,
            isCoop: scoresheet.isCoop,
            roundsScore: scoresheet.roundsScore,
            targetScore: scoresheet.targetScore,
            isDefault: scoresheet.isDefault,
          },
          rounds: scoresheet.rounds,
          scoreSheetChanged: false,
          roundChanged: false,
        };
      } else {
        return {
          scoresheetType: "shared" as const,
          sharedId: scoresheet.id,
          permission: scoresheet.permission,
          scoresheet: {
            id: scoresheet.id,
            name: scoresheet.name,
            winCondition: scoresheet.winCondition,
            isCoop: scoresheet.isCoop,
            roundsScore: scoresheet.roundsScore,
            targetScore: scoresheet.targetScore,
            isDefault: scoresheet.isDefault,
          },
          rounds: scoresheet.rounds,
          scoreSheetChanged: false,
          roundChanged: false,
        };
      }
    }),
    activeScoreSheetIndex: 0,
    activeForm: "game" as const,
  };
}
