import type { FileRouter } from "uploadthing/next";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { createUploadthing } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { db } from "@board-games/db/client";
import { image, user } from "@board-games/db/schema";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
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
    // Set permissions and file types for this FileRoute
    .middleware(async () => {
      // This code runs on your server before upload
      const authUser = await auth();

      // If you throw, the user will not be able to upload
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      if (!authUser.userId) throw new UploadThingError("Unauthorized");

      let returnedUser = (
        await db
          .selectDistinct()
          .from(user)
          .where(eq(user.clerkUserId, authUser.userId))
      )[0];
      if (!returnedUser) {
        await db.insert(user).values({ clerkUserId: authUser.userId });
        returnedUser = (
          await db
            .selectDistinct()
            .from(user)
            .where(eq(user.clerkUserId, authUser.userId))
        )[0];
      }
      if (!returnedUser) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw new UploadThingError("Unauthorized");
      }

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: returnedUser.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      const imageId = (
        await db
          .insert(image)
          .values({
            name: file.name,
            url: file.url,
            userId: metadata.userId,
          })
          .returning()
      )[0]?.id;
      if (!imageId) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw new UploadThingError("Unauthorized");
      }
      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return { uploadedBy: metadata.userId, imageId: imageId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
