import { TRPCError } from "@trpc/server";

import analyticsServerClient from "../analytics";

export function assertFound<T>(
  value: T | null | undefined,
  properties: {
    userId: string;
    value: Record<string | number, unknown>;
  },
  message = "Entity not found",
): asserts value is NonNullable<T> {
  if (!value) {
    analyticsServerClient.capture({
      distinctId: properties.userId,
      event: message,
      properties: properties.value,
    });
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
    analyticsServerClient.capture({
      distinctId: properties.userId,
      event: message,
      properties: properties.value,
    });
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message,
    });
  }
}
