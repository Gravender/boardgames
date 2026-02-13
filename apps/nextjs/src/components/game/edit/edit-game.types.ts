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

export type Rounds = z.infer<typeof roundsSchema>;
export const defaultEditRound = {
  ...defaultRound,
  roundId: null,
};
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
  rounds: [defaultEditRound],
};

export const defaultRoundsFormValues: {
  rounds: EditScoresheetForm["rounds"];
} = {
  rounds: [defaultEditRound],
};

export const defaultRoundPopoverValues: {
  round: EditScoresheetForm["rounds"][number];
} = {
  round: defaultEditRound,
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
  game: NonNullable<RouterOutputs["game"]["getGame"]>,
  scoresheets: NonNullable<
    RouterOutputs["game"]["gameScoreSheetsWithRounds"]
  >,
  roles: NonNullable<RouterOutputs["game"]["gameRoles"]>,
): EditGameFormValues {
  return {
    game: {
      name: game.name,
      ownedBy: game.ownedBy ?? false,
      playersMin: game.players.min,
      playersMax: game.players.max,
      playtimeMin: game.playtime.min,
      playtimeMax: game.playtime.max,
      yearPublished: game.yearPublished,
      gameImg: game.image
        ? game.image.type === "file"
          ? {
              type: "file" as const,
              file: game.image.url ?? "",
            }
          : {
              type: "svg" as const,
              name: game.image.name,
            }
        : null,
      roles: roles.map((role) => {
        if (role.type === "original") {
          return {
            type: "original" as const,
            id: role.id,
            name: role.name,
            description: role.description,
          };
        } else {
          return {
            type: "shared" as const,
            sharedId: role.sharedId,
            permission: role.permission,
            name: role.name,
            description: role.description,
          };
        }
      }),
    },
    scoresheets: scoresheets.map((scoresheet) => {
      if (scoresheet.type === "original") {
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
          rounds: scoresheet.rounds.map((r) => ({
            ...r,
            roundId: r.id,
          })),
          scoreSheetChanged: false,
          roundChanged: false,
        };
      } else {
        return {
          scoresheetType: "shared" as const,
          sharedId: scoresheet.sharedId,
          permission: scoresheet.permission,
          scoresheet: {
            id: scoresheet.sharedId,
            name: scoresheet.name,
            winCondition: scoresheet.winCondition,
            isCoop: scoresheet.isCoop,
            roundsScore: scoresheet.roundsScore,
            targetScore: scoresheet.targetScore,
            isDefault: scoresheet.isDefault,
          },
          rounds: scoresheet.rounds.map((r) => ({
            ...r,
            roundId: r.id,
          })),
          scoreSheetChanged: false,
          roundChanged: false,
        };
      }
    }),
    activeScoreSheetIndex: 0,
    activeForm: "game" as const,
  };
}
