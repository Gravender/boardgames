import type { FileRouter } from "uploadthing/next";
import { createUploadthing } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import z from "zod/v4";

import type { Auth } from "@board-games/auth";
import { db } from "@board-games/db/client";
import { image, matchImage } from "@board-games/db/schema";

export { UTApi } from "uploadthing/server";
const f = createUploadthing();

export function createUploadRouter(auth: Auth) {
  const router = {
    imageUploader: f({
      image: {
        /**
         * For full list of options and defaults, see the File Route API reference
         * @see https://docs.uploadthing.com/file-routes#route-config
         */
        maxFileSize: "4MB",
        maxFileCount: 1,
      },
    })
      .input(
        z.discriminatedUnion("usageType", [
          z.object({
            usageType: z.literal("match"),
            matchId: z.number(),
            caption: z.string().optional(),
            duration: z.number().optional(),
          }),
          z.object({
            usageType: z.literal("game"),
          }),
          z.object({
            usageType: z.literal("player"),
          }),
        ]),
      )
      .middleware(async ({ input, req }) => {
        // Get session from better-auth using request headers
        // UploadThing passes headers in req.headers which can be a Headers object or plain object
        const headers =
          req.headers instanceof Headers
            ? req.headers
            : new Headers(
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                Object.entries(req.headers ?? {}).flatMap(([key, value]) =>
                  Array.isArray(value)
                    ? value.map((v) => [key, v] as [string, string])
                    : value
                      ? [[key, value] as [string, string]]
                      : [],
                ),
              );

        const session = await auth.api.getSession({ headers });
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        if (!session) throw new UploadThingError("Unauthorized");
        return { userId: session.user.id, usageType: input.usageType, input };
      })
      .onUploadComplete(async ({ metadata, file }) => {
        const returnedImage = await db.transaction(async (tx) => {
          const [insertedImage] = await tx
            .insert(image)
            .values({
              name: file.name,
              url: file.url,
              createdBy: metadata.userId,
              type: "file",
              fileId: file.key,
              fileSize: file.size,
              usageType: metadata.usageType,
            })
            .returning();
          if (!insertedImage) {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw new UploadThingError("Image not added to database");
          }
          if (metadata.input.usageType === "match") {
            const returnedMatch = await tx.query.match.findFirst({
              where: {
                id: metadata.input.matchId,
                createdBy: metadata.userId,
              },
            });
            if (!returnedMatch) {
              // eslint-disable-next-line @typescript-eslint/only-throw-error
              throw new UploadThingError("Match not found");
            }
            const [returnedMatchImage] = await tx
              .insert(matchImage)
              .values({
                matchId: metadata.input.matchId,
                imageId: insertedImage.id,
                createdBy: metadata.userId,
                caption: metadata.input.caption,
                duration: metadata.input.duration,
              })
              .returning();
            if (!returnedMatchImage) {
              // eslint-disable-next-line @typescript-eslint/only-throw-error
              throw new UploadThingError("MatchImage not added to database");
            }
          }
          return insertedImage;
        });
        return { uploadedBy: metadata.userId, imageId: returnedImage.id };
      }),
  };
  // Type assertion to satisfy TypeScript's requirement for explicit type annotation
  // while preserving the inferred type structure for ReturnType
  return router as FileRouter;
}

// Export the inferred type for client-side usage
export type uploadRouter = ReturnType<typeof createUploadRouter>;
