import type { getAuth } from "@clerk/nextjs/server";
import { currentUser } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import superjson from "superjson";
import { z, ZodError } from "zod/v4";

import { db } from "@board-games/db/client";
import { player, user } from "@board-games/db/schema";

/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

type AuthObject = ReturnType<typeof getAuth>;

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = (opts: {
  headers: Headers;
  auth: AuthObject;
}) => {
  return {
    db,
    userId: opts.auth.userId,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError
            ? z.flattenError(error.cause as ZodError<Record<string, unknown>>)
            : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;
export const mergeRouters = t.mergeRouters;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.auth.userId) {
    console.log(ctx);
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      auth: ctx.auth,
    },
  });
});

const isUser = t.middleware(async ({ ctx, next }) => {
  const returnedUser = await ctx.db.transaction(async (tx) => {
    if (ctx.auth.userId === null) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    const [returnedUser] = await tx
      .select()
      .from(user)
      .where(eq(user.clerkUserId, ctx.auth.userId));

    if (!returnedUser) {
      const clerkUser = await currentUser();
      const [insertedUser] = await tx
        .insert(user)
        .values({
          clerkUserId: ctx.auth.userId,
          email: clerkUser?.emailAddresses[0]?.emailAddress,
          name: clerkUser?.fullName,
        })
        .returning();
      if (!insertedUser)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not insert user",
        });
      const [insertedPlayer] = await tx
        .insert(player)
        .values({
          name: clerkUser?.fullName ?? "",
          createdBy: insertedUser.id,
          isUser: true,
        })
        .returning();
      if (!insertedPlayer)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not insert player",
        });
      return insertedUser;
    }
    return returnedUser;
  });
  return next({
    ctx: {
      auth: ctx.auth,
      userId: returnedUser.id,
    },
  });
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);
export const protectedProcedure = t.procedure.use(isAuthed);
export const protectedUserProcedure = t.procedure.use(isUser);
