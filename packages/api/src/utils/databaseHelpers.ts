import { TRPCError } from "@trpc/server";

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
