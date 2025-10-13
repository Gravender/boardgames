import { z } from "zod/v4";

import {
  insertImageSchema,
  insertMatchSchema,
  insertPlayerSchema,
  insertRoundSchema,
  insertScoreSheetSchema,
  selectGameSchema,
  selectLocationSchema,
  selectMatchPlayerSchema,
  selectMatchSchema,
  selectTeamSchema,
} from "@board-games/db/zodSchema";

export const sharedOrOriginalSchema = z.union([
  z.literal("shared"),
  z.literal("original"),
]);

export const nonNullFileSchema = z
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
export const editRoleSchema = z.object({
  id: z.number(),
  name: z.string().min(1, {
    message: "Role name is required",
  }),
  description: z.string().nullable(),
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
  roles: z.array(editRoleSchema),
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
  roles: z.array(editRoleSchema),
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
    createdBy: true,
    type: true,
    gameId: true,
  })
  .required({ name: true, isCoop: true })
  .check((ctx) => {
    if (
      ctx.value.winCondition !== "Manual" &&
      ctx.value.roundsScore === "None"
    ) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        message:
          "Rounds score cannot be None when win condition is not Manual.",
        path: ["roundsScore"],
      });
    }
    if (ctx.value.isCoop) {
      if (
        ctx.value.winCondition !== "Manual" &&
        ctx.value.winCondition !== "Target Score"
      ) {
        ctx.issues.push({
          code: "custom",
          input: ctx.value,
          message:
            "Win condition must be Manual or Target Score for Coop games.",
          path: ["winCondition"],
        });
      }
    }
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

const baseEditScoresheetSchema = {
  isDefault: z.boolean().optional(),
  id: z.number(),
};
const originalEditScoresheetSchema = scoreSheetSchema.safeExtend({
  scoresheetType: z.literal("original"),
  ...baseEditScoresheetSchema,
});
const sharedEditScoresheetSchema = scoreSheetSchema.safeExtend({
  scoresheetType: z.literal("shared"),
  ...baseEditScoresheetSchema,
});
const newEditScoresheetSchema = scoreSheetSchema.safeExtend({
  ...baseEditScoresheetSchema,
  id: z.null(),
});
export const editScoresheetSchemaForm = z
  .discriminatedUnion("scoresheetType", [
    originalEditScoresheetSchema.safeExtend({
      scoreSheetChanged: z.boolean(),
      roundChanged: z.boolean(),
      rounds: roundsSchema,
    }),
    sharedEditScoresheetSchema.safeExtend({
      permission: z.literal("view").or(z.literal("edit")),
      scoreSheetChanged: z.boolean(),
      roundChanged: z.boolean(),
      rounds: roundsSchema,
    }),
    newEditScoresheetSchema.safeExtend({
      scoresheetType: z.literal("new"),
      rounds: roundsSchema,
    }),
  ])
  .check((ctx) => {
    if (
      ctx.value.winCondition !== "Manual" &&
      ctx.value.roundsScore === "None"
    ) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        message:
          "Rounds score cannot be None when win condition is not Manual.",
        path: ["roundsScore"],
      });
    }
    if (ctx.value.isCoop) {
      if (
        ctx.value.winCondition !== "Manual" &&
        ctx.value.winCondition !== "Target Score"
      ) {
        ctx.issues.push({
          code: "custom",
          input: ctx.value,
          message:
            "Win condition must be Manual or Target Score for Coop games.",
          path: ["winCondition"],
        });
      }
    }
    if (
      ctx.value.winCondition !== "Manual" &&
      ctx.value.roundsScore !== "Manual" &&
      ctx.value.rounds.length === 0
    ) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        message:
          "Rounds cannot be empty when win condition is not Manual and rounds score is not Manual.",
        path: ["roundsScore"],
        params: {
          roundsScore: ctx.value.roundsScore,
          winCondition: ctx.value.winCondition,
          rounds: ctx.value.rounds,
        },
      });
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        message:
          "Rounds cannot be empty when win condition is not Manual and rounds score is not Manual.",
        path: ["winCondition"],
        params: {
          roundsScore: ctx.value.roundsScore,
          winCondition: ctx.value.winCondition,
          rounds: ctx.value.rounds,
        },
      });
    }
  });

export const editScoresheetSchemaApiInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("New"),
    scoresheet: newEditScoresheetSchema.omit({ id: true }),
    rounds: roundsSchema,
  }),
  z.object({
    type: z.literal("Update Scoresheet"),
    scoresheet: z.discriminatedUnion("scoresheetType", [
      originalEditScoresheetSchema,
      sharedEditScoresheetSchema,
    ]),
  }),
  z.object({
    type: z.literal("Update Scoresheet & Rounds"),
    scoresheet: z
      .discriminatedUnion("scoresheetType", [
        originalEditScoresheetSchema,
        sharedEditScoresheetSchema,
      ])
      .or(
        z.object({
          id: z.number(),
          scoresheetType: z.literal("original").or(z.literal("shared")),
        }),
      ),
    roundsToEdit: z.array(
      baseRoundSchema
        .omit({ name: true, order: true })
        .extend({ id: z.number(), name: z.string().optional() }),
    ),
    roundsToAdd: z.array(
      baseRoundSchema.extend({
        scoresheetId: z.number(),
        order: z.number(),
      }),
    ),
    roundsToDelete: z.array(z.number()),
  }),
]);

export const imageSchema = insertImageSchema
  .pick({
    name: true,
    url: true,
    type: true,
    usageType: true,
  })
  .required({ name: true, url: true });
export const matchRoleSchema = z.array(z.number());
export const matchLocationSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    type: z.literal("original").or(z.literal("shared")),
    isDefault: z.boolean(),
  })
  .nullish();
export const addMatchPlayersSchema = z
  .array(
    insertPlayerSchema
      .pick({ name: true, id: true })
      .required({ name: true, id: true })
      .extend({
        type: z.literal("original").or(z.literal("shared")),
        imageUrl: z.string().nullable(),
        matches: z.number(),
        teamId: z.number().nullable(),
        roles: matchRoleSchema,
      }),
  )
  .refine((players) => players.length > 0, {
    message: "You must add at least one player",
  });
export const matchSchema = insertMatchSchema
  .pick({
    name: true,
    date: true,
  })
  .required({ name: true, date: true });
export const addMatchSchema = matchSchema.extend({
  players: addMatchPlayersSchema,
  location: matchLocationSchema,
  scoresheet: z.object({
    id: z.number(),
    scoresheetType: z.literal("original").or(z.literal("shared")),
  }),
  teams: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      roles: matchRoleSchema,
    }),
  ),
});
export const editMatchSchema = matchSchema.extend({
  players: addMatchPlayersSchema,
  location: matchLocationSchema,
  teams: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      roles: matchRoleSchema,
    }),
  ),
});

export const matchWithGameAndPlayersSchema = selectMatchSchema
  .pick({
    id: true,
    date: true,
    name: true,
    finished: true,
    comment: true,
  })
  .extend({
    type: sharedOrOriginalSchema,
    game: selectGameSchema
      .pick({
        id: true,
      })
      .extend({
        linkedGameId: z.number().nullable(),
        type: sharedOrOriginalSchema,
      }),
    location: selectLocationSchema
      .pick({
        id: true,
        name: true,
      })
      .nullable(),
    teams: z.array(
      selectTeamSchema.pick({
        id: true,
        name: true,
      }),
    ),
    matchPlayers: z.array(
      selectMatchPlayerSchema
        .pick({
          id: true,
          playerId: true,
          score: true,
          teamId: true,
          placement: true,
          winner: true,
        })
        .extend({
          name: z.string(),
          type: sharedOrOriginalSchema,
          playerType: z.literal("original").or(z.literal("shared")),
        }),
    ),
  });
