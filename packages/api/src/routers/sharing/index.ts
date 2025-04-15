import { mergeRouters } from "../../trpc";
import { shareAcceptanceRouter } from "./share-accept";
import { shareGameRouter } from "./share-game";
import { shareLinkRouter } from "./share-link";
import { shareLinkingRouter } from "./share-linking";
import { shareMetaRouter } from "./share-meta";
import { shareRequestRouter } from "./share-request";

export const sharingRouter = mergeRouters(
  shareAcceptanceRouter,
  shareLinkRouter,
  shareLinkingRouter,
  shareMetaRouter,
  shareRequestRouter,
  shareGameRouter,
);
