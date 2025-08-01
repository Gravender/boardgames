import type { FileRouter } from "uploadthing/next";
import { createUploadthing } from "uploadthing/next";
import { UploadThingError, UTApi } from "uploadthing/server";
import z from "zod/v4";

import { db } from "@board-games/db/client";
import { image, matchImage } from "@board-games/db/schema";

const f = createUploadthing();

export const uploadRouter = {
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
    .middleware(({ input }) => {
      //TODO: Add auth check
      return { usageType: input.usageType, input };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const [returnedImage] = await db
        .insert(image)
        .values({
          name: file.name,
          url: file.url,
          type: "file",
          fileId: file.key,
          fileSize: file.size,
          usageType: metadata.usageType,
        })
        .returning();
      if (!returnedImage) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw new UploadThingError("Image not added to database");
      }
      if (metadata.input.usageType === "match") {
        const returnedMatch = await db.query.match.findFirst({
          where: {
            id: metadata.input.matchId,
          },
        });
        if (!returnedMatch) {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw new UploadThingError("Match not found");
        }
        const [returnedMatchImage] = await db
          .insert(matchImage)
          .values({
            matchId: metadata.input.matchId,
            imageId: returnedImage.id,
            createdBy: "TODO",
            caption: metadata.input.caption,
            duration: metadata.input.duration,
          })
          .returning();
        if (!returnedMatchImage) {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw new UploadThingError("MatchImage not added to database");
        }
      }
      return { uploadedBy: "TODO", imageId: returnedImage.id };
    }),
} satisfies FileRouter;
export type uploadRouter = typeof uploadRouter;

export const utapi = new UTApi({});
