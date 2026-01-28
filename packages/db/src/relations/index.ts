import { defineRelationsPart } from "drizzle-orm";

import * as schema from "../schema";
// Import relation configs from separate files
// Each file exports the relation config using defineRelationsPart internally
import { gameRelations } from "./game.relations";
import { imageRelations } from "./image.relations";
import { locationRelations } from "./location.relations";
import { matchRelations } from "./match.relations";
import { playerRelations } from "./player.relations";
import { scoresheetRelations } from "./scoresheet.relations";
import { sharedRelations } from "./shared.relations";
import { userRelations } from "./user.relations";

// Combine all relation parts using object spread
// According to Drizzle docs, we can combine parts like this
const mainPart = defineRelationsPart(schema);
export const relations = {
  ...mainPart,
  ...userRelations,
  ...gameRelations,
  ...matchRelations,
  ...playerRelations,
  ...sharedRelations,
  ...scoresheetRelations,
  ...locationRelations,
  ...imageRelations,
};
