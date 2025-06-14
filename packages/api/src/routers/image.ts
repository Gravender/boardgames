import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod/v4";

import { image } from "@board-games/db/schema";
import { insertImageSchema } from "@board-games/db/zodSchema";

import analyticsServerClient from "../analytics";
import { createTRPCRouter, protectedUserProcedure } from "../trpc";
import { utapi } from "../uploadthing";

export const imageRouter = createTRPCRouter({
  create: protectedUserProcedure
    .input(insertImageSchema.omit({ userId: true, id: true }))
    .mutation(async ({ ctx, input }) => {
      const [dbImage] = await ctx.db
        .insert(image)
        .values({ ...input, userId: ctx.userId })
        .returning();
      if (!dbImage) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      return dbImage;
    }),
  delete: protectedUserProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const imageToDelete = await ctx.db.query.image.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      });
      if (!imageToDelete) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db.delete(image).where(eq(image.id, imageToDelete.id));
      if (imageToDelete.type === "file" && imageToDelete.fileId) {
        analyticsServerClient.capture({
          distinctId: ctx.auth.userId ?? "",
          event: "uploadthing begin image delete",
          properties: {
            imageName: imageToDelete.name,
            imageId: imageToDelete.id,
            fileId: imageToDelete.fileId,
          },
        });
        const result = await utapi.deleteFiles(imageToDelete.fileId);
        if (!result.success) {
          analyticsServerClient.capture({
            distinctId: ctx.auth.userId ?? "",
            event: "uploadthing image delete error",
            properties: {
              imageName: imageToDelete.name,
              imageId: imageToDelete.id,
              fileId: imageToDelete.fileId,
            },
          });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
      }
    }),
});
