import { defineRelationsPart } from "drizzle-orm";

import * as schema from "../schema";

export const playerRelations = defineRelationsPart(schema, (r) => ({
  player: {
    creator: r.one.user({
      from: r.player.createdBy,
      to: r.user.id,
      optional: false,
    }),
    image: r.one.image({
      from: r.player.imageId,
      to: r.image.id,
    }),
    linkedFriend: r.one.friend({
      from: r.player.friendId,
      to: r.friend.id,
    }),
    matches: r.many.match({
      from: r.player.id.through(r.matchPlayer.playerId),
      to: r.match.id.through(r.matchPlayer.matchId),
      where: {
        deletedAt: {
          isNull: true,
        },
      },
    }),
    sharedPlayers: r.many.sharedPlayer({
      from: r.player.id,
      to: r.sharedPlayer.playerId,
    }),
    sharedLinkedPlayers: r.many.sharedPlayer({
      from: r.player.id,
      to: r.sharedPlayer.linkedPlayerId,
    }),
    groups: r.many.group({
      from: r.player.id.through(r.groupPlayer.playerId),
      to: r.group.id.through(r.groupPlayer.groupId),
    }),
    matchPlayers: r.many.matchPlayer({
      from: r.player.id,
      to: r.matchPlayer.playerId,
      where: {
        deletedAt: {
          isNull: true,
        },
      },
    }),
  },
  group: {
    creator: r.one.user({
      from: r.group.createdBy,
      to: r.user.id,
    }),
    players: r.many.player({
      from: r.group.id.through(r.groupPlayer.groupId),
      to: r.player.id.through(r.groupPlayer.playerId),
      where: {
        deletedAt: {
          isNull: true,
        },
      },
    }),
  },
}));
