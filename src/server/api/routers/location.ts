import { get } from "http";
import { TRPCError } from "@trpc/server";
import { add } from "date-fns";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedUserProcedure } from "~/server/api/trpc";
import { insertLocationSchema, location } from "~/server/db/schema";

export const locationRouter = createTRPCRouter({
  getLocations: protectedUserProcedure.query(async ({ ctx }) => {
    return ctx.db.query.location.findMany({
      where: eq(location.createdBy, ctx.userId),
      with: {
        matches: true,
      },
    });
  }),
  getLocation: protectedUserProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.location.findFirst({
        where: and(
          eq(location.id, input.id),
          eq(location.createdBy, ctx.userId),
        ),
        with: {
          matches: true,
        },
      });
      if (!result) return null;
      return result;
    }),
  create: protectedUserProcedure
    .input(insertLocationSchema.pick({ name: true, isDefault: true }))
    .mutation(async ({ ctx, input }) => {
      if (input.isDefault) {
        await ctx.db
          .update(location)
          .set({ isDefault: false })
          .where(eq(location.createdBy, ctx.userId));
      }
      const result = (
        await ctx.db
          .insert(location)
          .values({
            name: input.name,
            isDefault: input.isDefault,
            createdBy: ctx.userId,
          })
          .returning()
      )[0];
      if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return result;
    }),
  update: protectedUserProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.isDefault) {
        await ctx.db
          .update(location)
          .set({ isDefault: false })
          .where(eq(location.createdBy, ctx.userId));
      }
      const result = await ctx.db
        .update(location)
        .set({
          name: input.name,
          isDefault: input.isDefault,
        })
        .where(eq(location.id, input.id))
        .returning();
      if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return result;
    }),
});
