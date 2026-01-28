import { defineRelationsPart } from "drizzle-orm";

import * as schema from "../schema";

export const gameRelations = defineRelationsPart(schema, (r) => ({
  game: {
    createdBy: r.one.user({
      from: r.game.createdBy,
      to: r.user.id,
    }),
    image: r.one.image({
      from: r.game.imageId,
      to: r.image.id,
    }),
    sharedGames: r.many.sharedGame({
      from: r.game.id,
      to: r.sharedGame.gameId,
    }),
    linkedGames: r.many.sharedGame({
      from: r.game.id,
      to: r.sharedGame.linkedGameId,
    }),
    matches: r.many.match({
      from: r.game.id,
      to: r.match.gameId,
      where: {
        deletedAt: {
          isNull: true,
        },
      },
    }),
    finishedMatches: r.many.match({
      from: r.game.id,
      to: r.match.gameId,
      where: {
        finished: true,
        deletedAt: {
          isNull: true,
        },
      },
    }),
    sharedGameMatches: r.many.sharedMatch({
      from: r.game.id.through(r.sharedGame.linkedGameId),
      to: r.sharedMatch.sharedGameId.through(r.sharedGame.id),
    }),
    roles: r.many.gameRole({
      from: r.game.id,
      to: r.gameRole.gameId,
    }),
    scoresheets: r.many.scoresheet({
      from: r.game.id,
      to: r.scoresheet.gameId,
      where: {
        OR: [{ type: "Default" }, { type: "Game" }],
        deletedAt: {
          isNull: true,
        },
      },
    }),
    tags: r.many.tag({
      from: r.game.id.through(r.gameTag.gameId),
      to: r.tag.id.through(r.gameTag.tagId),
    }),
  },
  gameRole: {
    game: r.one.game({
      from: r.gameRole.gameId,
      to: r.game.id,
      optional: false,
    }),
    matchPlayers: r.many.matchPlayer({
      from: r.gameRole.id.through(r.matchPlayerRole.roleId),
      to: r.matchPlayer.id.through(r.matchPlayerRole.matchPlayerId),
    }),
    sharedGameRoles: r.many.sharedGameRole({
      from: r.gameRole.id,
      to: r.sharedGameRole.gameRoleId,
    }),
  },
  tag: {
    createdBy: r.one.user({
      from: r.tag.createdBy,
      to: r.user.id,
      optional: false,
    }),
    games: r.many.game({
      from: r.tag.id.through(r.gameTag.tagId),
      to: r.game.id.through(r.gameTag.gameId),
    }),
  },
}));
