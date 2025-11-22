import { TRPCError } from "@trpc/server";

export function assertFound<T>(
  value: T | null | undefined,
  message = "Entity not found",
): T {
  if (value == null) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message,
    });
  }
  return value;
}
