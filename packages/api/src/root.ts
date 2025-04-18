import { dashboardRouter } from "./routers/dashboard";
import { gameRouter } from "./routers/game";
import { groupRouter } from "./routers/group";
import { imageRouter } from "./routers/image";
import { locationRouter } from "./routers/location";
import { matchRouter } from "./routers/match";
import { playerRouter } from "./routers/players";
import { roundRouter } from "./routers/round";
import { scoresheetRouter } from "./routers/scoresheet";
import { userRouter } from "./routers/user";
import { createCallerFactory, createTRPCRouter } from "./trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
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
