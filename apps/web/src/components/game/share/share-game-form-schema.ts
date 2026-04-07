import { z } from "zod/v4";

import {
  findShareMatch,
  getMatchIdKeys,
  getScoresheetNameById,
} from "./share-preview";
import type { GameData } from "./types";

/** Issues grouped by share UI section (inline highlights). */
export type ShareValidationSections = {
  recipients: string[];
  scoresheets: string[];
  matches: string[];
};

export const permissionSchema = z.enum(["view", "edit"]);
export type Permission = z.infer<typeof permissionSchema>;

export const sharingModeSchema = z.enum(["basic", "advanced"]);
export type SharingMode = z.infer<typeof sharingModeSchema>;

export const matchShareRowSchema = z.object({
  included: z.boolean(),
  includePlayers: z.boolean(),
  includeLocation: z.boolean(),
});
export type MatchShareRow = z.infer<typeof matchShareRowSchema>;

export const advancedUserShareSchema = z.object({
  permissionsVisible: z.boolean(),
  game: permissionSchema,
  rolePermissions: z.record(z.string(), permissionSchema),
  scoresheetPermissions: z.record(z.string(), permissionSchema),
  matchPermissions: z.record(z.string(), permissionSchema),
  locationPermissions: z.record(z.string(), permissionSchema),
  scoresheetPlayerPermissions: z.record(z.string(), permissionSchema),
  matchPlayerSyncWithMatch: z.record(z.string(), z.boolean()),
  matchPlayerPermissions: z.record(
    z.string(),
    z.record(z.string(), permissionSchema),
  ),
});
export type AdvancedUserShare = z.infer<typeof advancedUserShareSchema>;

export const shareGameFormValuesSchema = z.object({
  sharingMode: sharingModeSchema,
  recipients: z.array(
    z.object({
      userId: z.string().min(1),
      permission: permissionSchema,
    }),
  ),
  shareOptions: z.object({
    roles: z.boolean(),
    scoresheets: z.boolean(),
    matches: z.boolean(),
  }),
  matches: z.record(z.string(), matchShareRowSchema),
  roleInclusion: z.record(z.string(), z.boolean()),
  scoresheetInclusion: z.record(z.string(), z.boolean()),
  advancedPerUser: z.record(z.string(), advancedUserShareSchema),
});
export type ShareGameFormValues = z.infer<typeof shareGameFormValuesSchema>;

/** Default form state for {@link GameData}; parsed with {@link shareGameFormValuesSchema} so it always matches Zod. */
export const createInitialFormValues = (
  gameData: GameData,
): ShareGameFormValues => {
  const matches: ShareGameFormValues["matches"] = {};
  for (const id of getMatchIdKeys(gameData)) {
    matches[id] = {
      included: false,
      includePlayers: true,
      includeLocation: true,
    };
  }
  const roleInclusion: Record<string, boolean> = {};
  for (const r of gameData.gameRoles) {
    roleInclusion[String(r.id)] = true;
  }
  const scoresheetInclusion: Record<string, boolean> = {};
  for (const s of gameData.scoresheets) {
    scoresheetInclusion[String(s.id)] = true;
  }
  return shareGameFormValuesSchema.parse({
    sharingMode: "basic",
    recipients: [],
    shareOptions: { roles: false, scoresheets: false, matches: false },
    matches,
    roleInclusion,
    scoresheetInclusion,
    advancedPerUser: {},
  });
};

export const MATCH_SCORESHEET_MSG = (matchName: string, sheetName: string) =>
  `Session "${matchName}" uses "${sheetName}", which is not selected under Scoresheets to include. Select that scoresheet or remove this session.`;

/**
 * Cross-field rules that block sending a share request (recipients, match ↔ scoresheet).
 * Structural shape is validated by {@link shareGameFormValuesSchema}.
 */
export const createShareGameFormSubmitSchema = (gameData: GameData) =>
  shareGameFormValuesSchema.check((ctx) => {
    const data = ctx.value;
    if (data.recipients.length === 0) {
      ctx.issues.push({
        code: "custom",
        input: data,
        message: "Add at least one recipient.",
        path: ["recipients"],
      });
    }

    if (data.shareOptions.matches && data.shareOptions.scoresheets) {
      for (const [matchId, row] of Object.entries(data.matches)) {
        if (!row.included) continue;
        const m = findShareMatch(gameData, matchId);
        if (!m) continue;
        const sid = String(m.scoresheetId);
        if (data.scoresheetInclusion[sid] !== true) {
          const msg = MATCH_SCORESHEET_MSG(
            m.name,
            getScoresheetNameById(gameData, m.scoresheetId),
          );
          ctx.issues.push({
            code: "custom",
            input: data,
            message: msg,
            path: ["scoresheetInclusion", sid],
          });
          ctx.issues.push({
            code: "custom",
            input: data,
            message: msg,
            path: ["matches", matchId],
          });
        }
      }
    }
  });

/** Same submit validators as the root share form; use with `useAppForm` / shared options. */
export const createShareGameSubmitValidators = (gameData: GameData) => ({
  onSubmit: createShareGameFormSubmitSchema(gameData),
});

export const safeParseShareGameFormSubmit = (
  values: unknown,
  gameData: GameData,
) => createShareGameFormSubmitSchema(gameData).safeParse(values);

const firstPathKey = (
  path: ReadonlyArray<PropertyKey>,
): PropertyKey | undefined => path[0];

/** Maps Zod issues from {@link createShareGameFormSubmitSchema} to share UI sections. */
export const shareSubmitIssuesToValidationSections = (
  issues: readonly { message: string; path?: PropertyKey[] }[],
): ShareValidationSections => {
  const recipients: string[] = [];
  const scoresheets: string[] = [];
  const matches: string[] = [];
  for (const issue of issues) {
    const key = firstPathKey(issue.path ?? []);
    if (key === "recipients") {
      recipients.push(issue.message);
    } else if (key === "scoresheetInclusion") {
      scoresheets.push(issue.message);
    } else if (key === "matches") {
      matches.push(issue.message);
    } else {
      recipients.push(issue.message);
    }
  }
  return { recipients, scoresheets, matches };
};

/** Human-readable warning copy (non-blocking). Sidebar / confirm dialog use {@link deriveShareSummary} flags. */
export const SHARE_GAME_FORM_WARNING_MESSAGES = {
  matchesWithoutPlayers: "Some matches are shared without players.",
  matchSeatWithoutScoresheetPlayer:
    "A match player seat is shared, but that person is not shared under Players (scoresheets). Share the player there or turn off their match seat so identity lines up.",
} as const;
