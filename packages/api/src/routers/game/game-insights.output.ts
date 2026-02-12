import z from "zod/v4";

import { scoreSheetWinConditions } from "@board-games/db/constants";

// ─── Game Insights ───────────────────────────────────────────────

const corePlayerSchema = z.object({
  playerKey: z.string(),
  playerId: z.number(),
  playerName: z.string(),
  playerType: z.enum(["original", "shared"]),
  isUser: z.boolean(),
  image: z
    .object({
      name: z.string(),
      url: z.string().nullable(),
      type: z.string(),
    })
    .nullable(),
});

const playerCountBucketStatSchema = z.object({
  bucket: z.string(),
  matchCount: z.number(),
  finishesAboveRate: z.number(),
  avgPlacementDelta: z.number(),
  avgScoreDelta: z.number().nullable(),
});

const pairwiseStatSchema = z.object({
  playerA: corePlayerSchema,
  playerB: corePlayerSchema,
  finishesAboveRate: z.number(),
  avgPlacementDelta: z.number(),
  avgScoreDelta: z.number().nullable(),
  matchCount: z.number(),
  confidence: z.enum(["low", "medium", "high"]),
  byPlayerCount: z.array(playerCountBucketStatSchema),
});

const detectedCoreSchema = z.object({
  coreKey: z.string(),
  players: z.array(corePlayerSchema),
  matchCount: z.number(),
  matchIds: z.array(z.number()),
  stability: z.number(),
  guests: z.array(
    z.object({
      player: corePlayerSchema,
      count: z.number(),
    }),
  ),
  winCondition: z.enum(scoreSheetWinConditions),
  groupOrdering: z.array(
    z.object({
      player: corePlayerSchema,
      avgPlacement: z.number(),
      winRate: z.number(),
      wins: z.number(),
      losses: z.number(),
      rank: z.number(),
    }),
  ),
  pairwiseStats: z.array(pairwiseStatSchema),
});

const teamCoreSchema = detectedCoreSchema.extend({
  teamWinRate: z.number(),
  teamWins: z.number(),
  teamMatches: z.number(),
});

const teamConfigSchema = z.object({
  teams: z.array(
    z.object({
      players: z.array(corePlayerSchema),
      teamName: z.string(),
    }),
  ),
  matchCount: z.number(),
  matchIds: z.array(z.number()),
  outcomes: z.array(
    z.object({
      teamIndex: z.number(),
      wins: z.number(),
    }),
  ),
});

const insightsSummarySchema = z.object({
  mostCommonPlayerCount: z
    .object({
      count: z.number(),
      percentage: z.number(),
    })
    .nullable(),
  userPlayerCount: z
    .object({
      mostCommon: z.number(),
      percentage: z.number(),
      totalMatches: z.number(),
    })
    .nullable(),
  topRival: z
    .object({
      name: z.string(),
      finishesAboveRate: z.number(),
      matchCount: z.number(),
    })
    .nullable(),
  topPair: z
    .object({
      names: z.array(z.string()),
      matchCount: z.number(),
    })
    .nullable(),
  topTrio: z
    .object({
      names: z.array(z.string()),
      matchCount: z.number(),
    })
    .nullable(),
  topGroup: z
    .object({
      names: z.array(z.string()),
      matchCount: z.number(),
      playerCount: z.number(),
    })
    .nullable(),
  bestTeamCore: z
    .object({
      names: z.array(z.string()),
      winRate: z.number(),
      matchCount: z.number(),
    })
    .nullable(),
  totalMatchesAnalyzed: z.number(),
});

/** Shared schema for win-rate / match-count effect used in role presence effects. */
const relationEffectSchema = z
  .object({ winRate: z.number(), matches: z.number() })
  .nullable();

export const getGameInsightsOutput = z.object({
  summary: insightsSummarySchema,
  distribution: z.object({
    game: z.array(
      z.object({
        playerCount: z.number(),
        matchCount: z.number(),
        percentage: z.number(),
        winRate: z.number().nullable(),
      }),
    ),
    perPlayer: z.array(
      z.object({
        player: corePlayerSchema,
        distribution: z.array(
          z.object({
            playerCount: z.number(),
            matchCount: z.number(),
            winRate: z.number(),
          }),
        ),
      }),
    ),
  }),
  cores: z.object({
    pairs: z.array(detectedCoreSchema),
    trios: z.array(detectedCoreSchema),
    quartets: z.array(detectedCoreSchema),
  }),
  lineups: z.array(
    z.object({
      players: z.array(corePlayerSchema),
      matchCount: z.number(),
      matchIds: z.array(z.number()),
      matches: z.array(
        z.object({
          matchId: z.number(),
          date: z.date(),
        }),
      ),
    }),
  ),
  teams: z
    .object({
      cores: z.object({
        pairs: z.array(teamCoreSchema),
        trios: z.array(teamCoreSchema),
        quartets: z.array(teamCoreSchema),
      }),
      configurations: z.array(teamConfigSchema),
    })
    .nullable(),
  roles: z
    .object({
      winCondition: z.enum(scoreSheetWinConditions),
      roles: z.array(
        z.object({
          roleId: z.number(),
          name: z.string(),
          description: z.string().nullable(),
          matchCount: z.number(),
          winRate: z.number(),
          classificationBreakdown: z.object({
            unique: z.number(),
            team: z.number(),
            shared: z.number(),
          }),
          predominantClassification: z.enum(["unique", "team", "shared"]),
        }),
      ),
      presenceEffects: z.array(
        z.object({
          roleId: z.number(),
          name: z.string(),
          description: z.string().nullable(),
          classification: z.enum(["unique", "team", "shared"]),
          matchCount: z.number(),
          playerEffects: z.array(
            z.object({
              player: corePlayerSchema,
              self: relationEffectSchema,
              sameTeam: relationEffectSchema,
              opposingTeam: relationEffectSchema,
            }),
          ),
          roleEffects: z.array(
            z.object({
              otherRoleId: z.number(),
              otherRoleName: z.string(),
              samePlayer: relationEffectSchema,
              sameTeam: relationEffectSchema,
              opposingTeam: relationEffectSchema,
            }),
          ),
        }),
      ),
      playerPerformance: z.array(
        z.object({
          player: corePlayerSchema,
          roles: z.array(
            z.object({
              roleId: z.number(),
              name: z.string(),
              classification: z.enum(["unique", "team", "shared"]),
              winRate: z.number(),
              avgPlacement: z.number().nullable(),
              avgScore: z.number().nullable(),
              matchCount: z.number(),
            }),
          ),
        }),
      ),
    })
    .nullable(),
});

export type GetGameInsightsOutputType = z.infer<typeof getGameInsightsOutput>;
