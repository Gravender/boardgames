import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import type { DatabaseType, TransactionType } from "@board-games/db/client";
import { location, sharedLocation } from "@board-games/db/schema";

// In ../utils/handleSharedLocation.ts
export async function cloneSharedLocationForUser(
  tx: TransactionType | DatabaseType,
  sharedLocationId: number,
  userId: string,
) {
  const returnedSharedLocation = await tx.query.sharedLocation.findFirst({
    where: {
      sharedWithId: userId,
      id: sharedLocationId,
    },
    with: {
      location: true,
    },
  });

  if (!returnedSharedLocation) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Shared location not found.",
    });
  }

  const [newLocation] = await tx
    .insert(location)
    .values({
      name: returnedSharedLocation.location.name,
      isDefault: returnedSharedLocation.isDefault,
      createdBy: userId,
    })
    .returning();

  if (!newLocation) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create location.",
    });
  }

  await tx
    .update(sharedLocation)
    .set({ linkedLocationId: newLocation.id, isDefault: false })
    .where(eq(sharedLocation.id, returnedSharedLocation.id));

  return newLocation.id;
}
