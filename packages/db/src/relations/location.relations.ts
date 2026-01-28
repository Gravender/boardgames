import { defineRelationsPart } from "drizzle-orm";

import * as schema from "../schema";

export const locationRelations = defineRelationsPart(schema, (r) => ({
  location: {
    creator: r.one.user({
      from: r.location.createdBy,
      to: r.user.id,
    }),
    matches: r.many.match({
      from: r.location.id,
      to: r.match.locationId,
      where: {
        deletedAt: {
          isNull: true,
        },
      },
    }),
    linkedLocations: r.many.sharedLocation({
      from: r.location.id,
      to: r.sharedLocation.linkedLocationId,
    }),
    sharedMatches: r.many.sharedMatch({
      from: r.location.id.through(r.sharedLocation.linkedLocationId),
      to: r.sharedMatch.sharedLocationId.through(r.sharedLocation.id),
    }),
  },
}));
