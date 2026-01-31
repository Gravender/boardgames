import { defineRelationsPart } from "drizzle-orm";

import * as schema from "../schema";

export const scoresheetRelations = defineRelationsPart(schema, (r) => ({
  scoresheet: {
    creator: r.one.user({
      from: r.scoresheet.createdBy,
      to: r.user.id,
    }),
    game: r.one.game({
      from: r.scoresheet.gameId,
      to: r.game.id,
      optional: false,
    }),
    sharedScoresheets: r.many.sharedScoresheet({
      from: r.scoresheet.id,
      to: r.sharedScoresheet.scoresheetId,
    }),
    matches: r.many.match({
      from: r.scoresheet.id,
      to: r.match.scoresheetId,
    }),
    rounds: r.many.round({
      from: r.scoresheet.id,
      to: r.round.scoresheetId,
      where: {
        deletedAt: {
          isNull: true,
        },
      },
    }),
    parent: r.one.scoresheet({
      from: r.scoresheet.parentId,
      to: r.scoresheet.id,
    }),
    childScoresheets: r.many.scoresheet({
      from: r.scoresheet.id,
      to: r.scoresheet.parentId,
    }),
  },
}));
