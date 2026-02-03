import { z } from "zod/v4";

import { scoresheet } from "@board-games/db/schema";
import {
  insertImageSchema,
  insertMatchSchema,
  insertPlayerSchema,
  insertRoundSchema,
  insertScoreSheetSchema,
  selectGameRoleSchema,
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
export const sharedOrLinkedSchema = z.union([
  z.literal("shared"),
  z.literal("linked"),
]);
export const sharedOrOriginalOrLinkedSchema = z.union([
  z.literal("shared"),
  z.literal("original"),
  z.literal("linked"),
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
export const baseRoleSchema = selectGameRoleSchema.pick({
  name: true,
  description: true,
});
export const originalRoleSchema = baseRoleSchema.extend({
  type: z.literal("original"),
  id: z.number(),
});
export const sharedRoleSchema = baseRoleSchema.extend({
  type: z.literal("shared"),
  sharedId: z.number(),
});
export const editRoleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: z.number(),
    name: z.string().min(1, {
      message: "Role name is required",
    }),
    description: z.string().nullable(),
  }),
  z.object({
    type: z.literal("shared"),
    sharedId: z.number(),
    permission: z.literal("edit").or(z.literal("view")),
    name: z.string().min(1, {
      message: "Role name is required",
    }),
    description: z.string().nullable(),
  }),
  z.object({
    type: z.literal("new"),
    id: z.number(),
    name: z.string().min(1, {
      message: "Role name is required",
    }),
    description: z.string().nullable(),
  }),
]);
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
  .pick({
    name: true,
    isCoop: true,
    winCondition: true,
    roundsScore: true,
    targetScore: true,
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
          path: ["winCondition", "isCoop"],
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

export const editScoresheetSchemaApiInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("New"),
    scoresheet: scoreSheetSchema.safeExtend({
      isDefault: z.boolean().optional(),
    }),
    rounds: roundsSchema,
  }),
  z.object({
    type: z.literal("Update Scoresheet"),
    scoresheet: z.discriminatedUnion("scoresheetType", [
      scoreSheetSchema.safeExtend({
        scoresheetType: z.literal("original"),
        id: z.number(),
        isDefault: z.boolean().optional(),
      }),
      scoreSheetSchema.safeExtend({
        scoresheetType: z.literal("shared"),
        sharedId: z.number(),
        isDefault: z.boolean().optional(),
      }),
    ]),
  }),
  z.object({
    type: z.literal("Update Scoresheet & Rounds"),
    scoresheet: z.discriminatedUnion("scoreSheetUpdated", [
      z.discriminatedUnion("scoresheetType", [
        scoreSheetSchema.safeExtend({
          scoreSheetUpdated: z.literal("updated"),
          scoresheetType: z.literal("original"),
          id: z.number(),
          isDefault: z.boolean().optional(),
        }),
        scoreSheetSchema.safeExtend({
          scoreSheetUpdated: z.literal("updated"),
          scoresheetType: z.literal("shared"),
          sharedId: z.number(),
          isDefault: z.boolean().optional(),
        }),
      ]),

      z.discriminatedUnion("scoresheetType", [
        z.object({
          scoreSheetUpdated: z.literal("false"),
          scoresheetType: z.literal("original"),
          id: z.number(),
        }),
        z.object({
          scoreSheetUpdated: z.literal("false"),
          scoresheetType: z.literal("shared"),
          sharedId: z.number(),
        }),
      ]),
    ]),
    roundsToEdit: z.array(
      baseRoundSchema
        .omit({ name: true, order: true })
        .extend({ id: z.number(), name: z.string().optional() }),
    ),
    roundsToAdd: z.array(
      baseRoundSchema.extend({
        order: z.number(),
      }),
    ),
    roundsToDelete: z.array(z.number()),
  }),
]);
const baseImageSchema = insertImageSchema
  .pick({
    name: true,
    url: true,
    type: true,
  })
  .required({ name: true, url: true });
export const imageSchema = insertImageSchema
  .pick({
    name: true,
    url: true,
    type: true,
    usageType: true,
  })
  .required({ name: true, url: true });
export const playerImageSchema = baseImageSchema.extend({
  usageType: z.literal("player"),
});
export const matchImageSchema = baseImageSchema.extend({
  usageType: z.literal("match"),
});
export const gameImageSchema = baseImageSchema.extend({
  usageType: z.literal("game"),
});

export const matchLocationSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    type: sharedOrOriginalSchema,
    isDefault: z.boolean(),
  })
  .nullish();
export const addMatchPlayersSchema = z
  .array(
    insertPlayerSchema
      .pick({ name: true, id: true })
      .required({ name: true, id: true })
      .extend({
        type: sharedOrOriginalOrLinkedSchema,
        imageUrl: z.string().nullable(),
        matches: z.number(),
        teamId: z.number().nullable(),
        roles: z.array(
          z.discriminatedUnion("type", [originalRoleSchema, sharedRoleSchema]),
        ),
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
      roles: z.array(
        z.discriminatedUnion("type", [originalRoleSchema, sharedRoleSchema]),
      ),
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
      roles: z.array(
        z.discriminatedUnion("type", [originalRoleSchema, sharedRoleSchema]),
      ),
    }),
  ),
});

export const baseLocationSchema = selectLocationSchema.pick({
  id: true,
  name: true,
});
export const baseMatchPlayerSchema = selectMatchPlayerSchema
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
    image: imageSchema.nullable(),
    isUser: z.boolean(),
  });
export const baseGameForMatchSchema = selectGameSchema
  .pick({
    id: true,
    name: true,
  })
  .extend({
    image: imageSchema.nullable(),
  });
export const baseMatchSchema = selectMatchSchema
  .pick({
    id: true,
    date: true,
    name: true,
    finished: true,
    comment: true,
    duration: true,
  })
  .extend({
    won: z.boolean(),
    hasUser: z.boolean(),
    isCoop: z.boolean(),
    winCondition: z.enum(scoresheet.winCondition.enumValues),
    type: sharedOrOriginalSchema,
    teams: z.array(
      selectTeamSchema.pick({
        id: true,
        name: true,
      }),
    ),
  });
const sharedMatchWithGameAndPlayersSchema = baseMatchSchema.extend({
  type: z.literal("shared"),
  sharedMatchId: z.number(),
  permissions: z.literal("view").or(z.literal("edit")),
  game: baseGameForMatchSchema.extend({
    type: sharedOrLinkedSchema,
    sharedGameId: z.number(),
    linkedGameId: z.number().nullable(),
  }),
  location: baseLocationSchema.nullable(),
  matchPlayers: z.array(
    baseMatchPlayerSchema.extend({
      type: z.literal("shared"),
      playerType: z.union([
        z.literal("linked"),
        z.literal("shared"),
        z.literal("not-shared"),
      ]),
      sharedPlayerId: z.number().nullable(),
      linkedPlayerId: z.number().nullable(),
    }),
  ),
});
const originalMatchWithGameAndPlayersSchema = baseMatchSchema.extend({
  type: z.literal("original"),
  game: baseGameForMatchSchema.extend({
    type: z.literal("original"),
  }),
  location: baseLocationSchema.nullable(),
  matchPlayers: z.array(
    baseMatchPlayerSchema.extend({
      type: z.literal("original"),
      playerType: z.literal("original"),
    }),
  ),
});
export const matchWithGameAndPlayersSchema = z.discriminatedUnion("type", [
  originalMatchWithGameAndPlayersSchema,
  sharedMatchWithGameAndPlayersSchema,
]);
