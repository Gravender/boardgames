import { createTRPCRouter, mergeRouters } from "@board-games/api/trpc";

import { shareAcceptanceRouter } from "./share-accept";
import { shareGameRouter } from "./share-game";
import { shareLinkRouter } from "./share-link";
import { shareLinkingRouter } from "./share-linking";
import { shareLocationRouter } from "./share-location";
import { shareMatchRouter } from "./share-match";
import { shareMetaRouter } from "./share-meta";
import { sharePlayerRouter } from "./share-player";
import { shareRequestRouter } from "./share-request";

export const sharingRouter = mergeRouters(
  createTRPCRouter(shareAcceptanceRouter),
  createTRPCRouter(shareLinkRouter),
  createTRPCRouter(shareLinkingRouter),
  createTRPCRouter(shareMetaRouter),
  createTRPCRouter(shareRequestRouter),
  createTRPCRouter(shareGameRouter),
  createTRPCRouter(shareLocationRouter),
  createTRPCRouter(shareMatchRouter),
  createTRPCRouter(sharePlayerRouter),
);
