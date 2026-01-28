import { defineRelationsPart } from "drizzle-orm";

import * as schema from "../schema";

export const imageRelations = defineRelationsPart(schema, (r) => ({
  image: {
    players: r.many.player({
      from: r.image.id,
      to: r.player.imageId,
    }),
    createdBy: r.many.user({
      from: r.image.id,
      to: r.user.id,
    }),
    games: r.many.game({
      from: r.image.id,
      to: r.game.imageId,
    }),
  },
}));
