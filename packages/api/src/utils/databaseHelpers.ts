import type { PostHog } from "posthog-node";
import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";

export function assertFound<T>(
  value: T | null | undefined,
  properties: {
    userId: string;
    value: Record<string | number, unknown>;
  },
  message = "Entity not found",
): asserts value is NonNullable<T> {
  if (!value) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message,
    });
  }
}
export function assertInserted<T>(
  value: T,
  properties: {
    userId: string;
    value: Record<string | number, unknown>;
  },
  message = "Entity Not Inserted",
): asserts value is NonNullable<T> {
  if (!value) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message,
    });
  }
}

export function assertUpdated<T>(
  value: T,
  properties: {
    userId: string;
    value: Record<string | number, unknown>;
  },
  message = "Entity Not Updated",
): asserts value is NonNullable<T> {
  if (!value) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message,
    });
  }
}

export interface BaseRepoArgs<TInput> {
  input: TInput;
  tx?: TransactionType;
}
export interface BaseServiceArgs<TInput> {
  input: TInput;
  ctx: {
    userId: string;
    posthog: PostHog;
  };
}

export interface WithTx {
  tx?: TransactionType;
}
