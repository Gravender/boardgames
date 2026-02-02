import { z } from "zod/v4";

/**
 * Round engine contract: config and value shapes per kind.
 * Validated by Zod per kind; extend when adding new round kinds.
 */

export const ROUND_KINDS = [
  "numeric",
  "checkbox",
  "rank",
  "timer",
  "resources",
  "victoryPoints",
] as const;

export type RoundKind = (typeof ROUND_KINDS)[number];

/** Config shape per kind. Canonical shapes for round.config (JSONB). */
export const roundConfigNumericSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
  })
  .strict();

export const roundConfigCheckboxSchema = z
  .object({
    value: z.number().optional(),
  })
  .strict();

export const roundConfigRankSchema = z
  .object({
    rankToPoints: z.record(z.string(), z.number()).optional(),
  })
  .strict();

export const roundConfigTimerSchema = z.object({}).strict();
export const roundConfigResourcesSchema = z.object({}).strict();
export const roundConfigVictoryPointsSchema = z.object({}).strict();

export const roundConfigByKindSchema: Record<
  RoundKind,
  z.ZodType<Record<string, unknown>>
> = {
  numeric: roundConfigNumericSchema,
  checkbox: roundConfigCheckboxSchema,
  rank: roundConfigRankSchema,
  timer: roundConfigTimerSchema,
  resources: roundConfigResourcesSchema,
  victoryPoints: roundConfigVictoryPointsSchema,
};

/** Validates round.config for a given kind. */
export function parseRoundConfig(
  kind: RoundKind | null | undefined,
  config: unknown,
): Record<string, unknown> {
  if (kind == null || !ROUND_KINDS.includes(kind)) {
    return typeof config === "object" &&
      config !== null &&
      !Array.isArray(config)
      ? (config as Record<string, unknown>)
      : {};
  }
  const schema = roundConfigByKindSchema[kind];
  const result = schema.safeParse(config ?? {});
  return result.success ? result.data : {};
}

/** Value shape per kind for round_player.value (JSONB). */
export const roundPlayerValueNumericSchema = z
  .object({
    n: z.number().optional(),
  })
  .strict();

export const roundPlayerValueCheckboxSchema = z
  .object({
    b: z.boolean().optional(),
  })
  .strict();

export const roundPlayerValueByKindSchema: Record<
  RoundKind,
  z.ZodType<Record<string, unknown>>
> = {
  numeric: roundPlayerValueNumericSchema,
  checkbox: roundPlayerValueCheckboxSchema,
  rank: z.object({}).strict(),
  timer: z.object({ ms: z.number().optional() }).strict(),
  resources: z.record(z.string(), z.number()),
  victoryPoints: z.object({ vp: z.number().optional() }).strict(),
};

/** Validates round_player.value for a given kind. */
export function parseRoundPlayerValue(
  kind: RoundKind | null | undefined,
  value: unknown,
): Record<string, unknown> {
  if (kind == null || !ROUND_KINDS.includes(kind)) {
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }
  const schema = roundPlayerValueByKindSchema[kind];
  const result = schema.safeParse(value ?? {});
  return result.success ? result.data : {};
}
