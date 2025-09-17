import { dashboardRouter } from "./routers/dashboard";
import { friendsRouter } from "./routers/friends";
import { gameRouter } from "./routers/game";
import { groupRouter } from "./routers/group";
import { imageRouter } from "./routers/image";
import { locationRouter } from "./routers/location";
import { matchRouter } from "./routers/match";
import { matchRouter as newMatchRouter } from "./routers/match/match.router";
import { playerRouter } from "./routers/players";
import { roundRouter } from "./routers/round";
import { scoresheetRouter } from "./routers/scoresheet";
import { sharingRouter } from "./routers/sharing";
import { userRouter } from "./routers/user";
import { createTRPCRouter } from "./trpc";

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
  newMatch: newMatchRouter,
  player: playerRouter,
  round: roundRouter,
  dashboard: dashboardRouter,
  group: groupRouter,
  location: locationRouter,
  friend: friendsRouter,
  sharing: sharingRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
