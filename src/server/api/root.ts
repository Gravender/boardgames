import { gameRouter } from "~/server/api/routers/game";
import { imageRouter } from "~/server/api/routers/image";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

import { dashboardRouter } from "./routers/dashboard";
import { groupRouter } from "./routers/group";
import { locationRouter } from "./routers/location";
import { matchRouter } from "./routers/match";
import { playerRouter } from "./routers/players";
import { roundRouter } from "./routers/round";
import { scoresheetRouter } from "./routers/scoresheet";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  game: gameRouter,
  image: imageRouter,
  scoresheet: scoresheetRouter,
  match: matchRouter,
  player: playerRouter,
  round: roundRouter,
  dashboard: dashboardRouter,
  group: groupRouter,
  location: locationRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
