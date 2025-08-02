import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod/v4";

import { image, matchImage } from "@board-games/db/schema";
import { insertImageSchema } from "@board-games/db/zodSchema";

import analyticsServerClient from "../analytics";
import { protectedUserProcedure } from "../trpc";
import { utapi } from "../uploadthing";

export const imageRouter = {
  create: protectedUserProcedure
    .input(insertImageSchema.omit({ createdBy: true, id: true }))
    .mutation(async ({ ctx, input }) => {
      const [dbImage] = await ctx.db
        .insert(image)
        .values({ ...input, createdBy: ctx.userId })
        .returning();
      if (!dbImage) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      return dbImage;
    }),
  getMatchImages: protectedUserProcedure
    .input(z.object({ matchId: z.number() }))
    .query(async ({ ctx, input }) => {
      const matchImages = await ctx.db.query.matchImage.findMany({
        where: {
          matchId: input.matchId,
          createdBy: ctx.userId,
        },
        with: {
          image: true,
        },
      });
      return matchImages.map((matchImage) => ({
        id: matchImage.id,
        url: matchImage.image.url,
        caption: matchImage.caption ?? "",
        duration: matchImage.duration,
      }));
    }),
  delete: protectedUserProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const imageToDelete = await ctx.db.query.image.findFirst({
        where: {
          id: input.id,
        },
      });
      if (!imageToDelete) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db.delete(image).where(eq(image.id, imageToDelete.id));
      if (imageToDelete.type === "file" && imageToDelete.fileId) {
        analyticsServerClient.capture({
          distinctId: ctx.userId,
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
            distinctId: ctx.userId,
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
  deleteMatchImage: protectedUserProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const returnedMatchImage = await tx.query.matchImage.findFirst({
          where: {
            id: input.id,
          },
          with: {
            image: true,
          },
        });
        if (!returnedMatchImage) {
          analyticsServerClient.capture({
            distinctId: ctx.userId,
            event: "delete match image error",
            properties: {
              id: input.id,
              error: "Not found",
            },
          });
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await tx
          .delete(matchImage)
          .where(eq(matchImage.id, returnedMatchImage.id));
        if (
          returnedMatchImage.image.type === "file" &&
          returnedMatchImage.image.fileId
        ) {
          analyticsServerClient.capture({
            distinctId: ctx.userId,
            event: "uploadthing begin image delete",
            properties: {
              imageName: returnedMatchImage.image.name,
              imageId: returnedMatchImage.image.id,
              fileId: returnedMatchImage.image.fileId,
            },
          });
          const result = await utapi.deleteFiles(
            returnedMatchImage.image.fileId,
          );
          if (!result.success) {
            analyticsServerClient.capture({
              distinctId: ctx.userId,
              event: "uploadthing image delete error",
              properties: {
                imageName: returnedMatchImage.image.name,
                imageId: returnedMatchImage.image.id,
                fileId: returnedMatchImage.image.fileId,
              },
            });
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
          }
          await tx
            .delete(image)
            .where(eq(image.id, returnedMatchImage.image.id));
        }
      });
    }),
} satisfies TRPCRouterRecord;
