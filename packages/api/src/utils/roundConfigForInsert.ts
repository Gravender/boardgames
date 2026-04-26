import { parseRoundConfig, type RoundKind } from "@board-games/shared";

import type { InsertRoundInputType } from "../repositories/scoresheet/round.repository.types";

/**
 * Validates/normalizes JSON round.config using the shared kind-aware Zod schemas
 * ({@link parseRoundConfig}) before persistence.
 */
export const roundConfigForInsert = (
  kind: string | null | undefined,
  config: unknown,
): InsertRoundInputType["config"] =>
  parseRoundConfig(
    kind as RoundKind | null | undefined,
    config,
  ) as InsertRoundInputType["config"];
