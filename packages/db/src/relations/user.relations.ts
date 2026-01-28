import { defineRelationsPart } from "drizzle-orm";

import * as schema from "../schema";

export const userRelations = defineRelationsPart(schema, (r) => ({
  userSharingPreference: {
    user: r.one.user({
      from: r.userSharingPreference.userId,
      to: r.user.id,
    }),
  },
  user: {
    userSharingPreferences: r.many.userSharingPreference({
      from: r.user.id,
      to: r.userSharingPreference.userId,
    }),
    images: r.many.image({
      from: r.user.id,
      to: r.image.createdBy,
    }),
    groups: r.many.group({
      from: r.user.id,
      to: r.group.id,
    }),
    locations: r.many.location({
      from: r.user.id,
      to: r.location.createdBy,
      where: {
        deletedAt: {
          isNull: true,
        },
      },
    }),
    linkedPlayer: r.many.player({
      from: r.user.id,
      to: r.player.createdBy,
      where: {
        isUser: true,
        deletedAt: {
          isNull: true,
        },
      },
    }),
    createdPlayers: r.many.player({
      from: r.user.id,
      to: r.player.createdBy,
      where: {
        deletedAt: {
          isNull: true,
        },
      },
    }),
    games: r.many.game({
      from: r.user.id,
      to: r.game.createdBy,
      where: {
        deletedAt: {
          isNull: true,
        },
      },
    }),
    matches: r.many.match({
      from: r.user.id,
      to: r.match.createdBy,
      where: {
        deletedAt: {
          isNull: true,
        },
      },
    }),
    sharedGamesOwner: r.many.sharedGame({
      from: r.user.id,
      to: r.sharedGame.ownerId,
    }),
    sharedGameSharedWith: r.many.sharedGame({
      from: r.user.id,
      to: r.sharedGame.sharedWithId,
    }),
    sharedGamesSharedWithPassthrough: r.many.game({
      from: r.user.id.through(r.sharedGame.sharedWithId),
      to: r.game.id.through(r.sharedGame.gameId),
    }),
    sharedPlayersOwner: r.many.sharedPlayer({
      from: r.user.id,
      to: r.sharedPlayer.ownerId,
    }),
    sharedPlayersSharedWith: r.many.sharedPlayer({
      from: r.user.id,
      to: r.sharedPlayer.sharedWithId,
    }),
    sharedPlayersSharedWithPassthrough: r.many.player({
      from: r.user.id.through(r.sharedPlayer.sharedWithId),
      to: r.player.id.through(r.sharedPlayer.playerId),
    }),
    sharedMatchesOwner: r.many.sharedMatch({
      from: r.user.id,
      to: r.sharedMatch.ownerId,
    }),
    sharedMatchesSharedWith: r.many.sharedMatch({
      from: r.user.id,
      to: r.sharedMatch.sharedWithId,
    }),
    sharedMatchesSharedWithPassthrough: r.many.match({
      from: r.user.id.through(r.sharedMatch.sharedWithId),
      to: r.match.id.through(r.sharedMatch.matchId),
    }),
    sharedScoresheetsOwner: r.many.sharedScoresheet({
      from: r.user.id,
      to: r.sharedScoresheet.ownerId,
    }),
    sharedScoresheetsSharedWith: r.many.sharedScoresheet({
      from: r.user.id,
      to: r.sharedScoresheet.sharedWithId,
    }),
    sharedMatchPlayersOwner: r.many.sharedMatchPlayer({
      from: r.user.id,
      to: r.sharedMatchPlayer.ownerId,
    }),
    sharedMatchPlayersSharedWith: r.many.sharedMatchPlayer({
      from: r.user.id,
      to: r.sharedMatchPlayer.sharedWithId,
    }),
    sharedLocationsOwner: r.many.sharedLocation({
      from: r.user.id,
      to: r.sharedLocation.ownerId,
    }),
    sharedLocationsSharedWith: r.many.sharedLocation({
      from: r.user.id,
      to: r.sharedLocation.sharedWithId,
    }),
    shareRequestsReceived: r.many.shareRequest({
      from: r.user.id,
      to: r.shareRequest.sharedWithId,
    }),
    shareRequestsSent: r.many.shareRequest({
      from: r.user.id,
      to: r.shareRequest.ownerId,
    }),
    friendRequestsReceived: r.many.friendRequest({
      from: r.user.id,
      to: r.friendRequest.requesteeId,
    }),
    friendRequestsSent: r.many.friendRequest({
      from: r.user.id,
      to: r.friendRequest.userId,
    }),
    friends: r.many.friend({
      from: r.user.id,
      to: r.friend.userId,
    }),
    friendSettings: r.many.friendSetting({
      from: r.user.id,
      to: r.friendSetting.createdById,
    }),
  },
  friend: {
    user: r.one.user({
      from: r.friend.userId,
      to: r.user.id,
      optional: false,
    }),
    friend: r.one.user({
      from: r.friend.friendId,
      to: r.user.id,
      optional: false,
    }),
    friendSetting: r.one.friendSetting({
      from: r.friend.id,
      to: r.friendSetting.friendId,
    }),
    friendPlayer: r.one.player({
      from: r.friend.id,
      to: r.player.friendId,
    }),
  },
  friendRequest: {
    user: r.one.user({
      from: r.friendRequest.userId,
      to: r.user.id,
      optional: false,
    }),
    requestee: r.one.user({
      from: r.friendRequest.requesteeId,
      to: r.user.id,
      optional: false,
    }),
  },
  friendSetting: {
    createdBy: r.one.user({
      from: r.friendSetting.createdById,
      to: r.user.id,
      optional: false,
    }),
    friend: r.one.friend({
      from: r.friendSetting.friendId,
      to: r.friend.id,
      optional: false,
    }),
  },
}));
