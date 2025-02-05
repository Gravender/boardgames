import type { FileRouter } from "uploadthing/next";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { createUploadthing } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { db } from "@board-games/db/client";
import { image, user } from "@board-games/db/schema";

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
    .middleware(async () => {
      const authUser = await auth();
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      if (!authUser.userId) throw new UploadThingError("Unauthorized");

      const [returnedUser] = await db
        .selectDistinct()
        .from(user)
        .where(eq(user.clerkUserId, authUser.userId));
      if (!returnedUser) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw new UploadThingError("Unauthorized");
      }
      return { userId: returnedUser.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const [returnedImage] = await db
        .insert(image)
        .values({
          name: file.name,
          url: file.url,
          userId: metadata.userId,
        })
        .returning();
      if (!returnedImage) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw new UploadThingError("Unauthorized");
      }
      return { uploadedBy: metadata.userId, imageId: returnedImage.id };
    }),
} satisfies FileRouter;
export type uploadRouter = typeof uploadRouter;
