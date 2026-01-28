import { defineRelationsPart } from "drizzle-orm";

import * as schema from "../schema";

export const sharedRelations = defineRelationsPart(schema, (r) => ({
  sharedMatchPlayer: {
    matchPlayer: r.one.matchPlayer({
      from: r.sharedMatchPlayer.matchPlayerId,
      to: r.matchPlayer.id,
      optional: false,
    }),
    sharedPlayer: r.one.sharedPlayer({
      from: r.sharedMatchPlayer.sharedPlayerId,
      to: r.sharedPlayer.id,
    }),
    sharedMatch: r.one.sharedMatch({
      from: r.sharedMatchPlayer.sharedMatchId,
      to: r.sharedMatch.id,
      optional: false,
    }),
    roles: r.many.sharedMatchPlayerRole({
      from: r.sharedMatchPlayer.id,
      to: r.sharedMatchPlayerRole.sharedMatchPlayerId,
    }),
    match: r.one.match({
      from: r.sharedMatchPlayer.sharedMatchId.through(r.sharedMatch.id),
      to: r.match.id.through(r.sharedMatch.matchId),
      optional: false,
    }),
  },
  sharedGame: {
    game: r.one.game({
      from: r.sharedGame.gameId,
      to: r.game.id,
      optional: false,
    }),
    linkedGame: r.one.game({
      from: r.sharedGame.linkedGameId,
      to: r.game.id,
      where: {
        deletedAt: {
          isNull: true,
        },
      },
    }),
    owner: r.one.user({
      from: r.sharedGame.ownerId,
      to: r.user.id,
      optional: false,
    }),
    sharedWith: r.one.user({
      from: r.sharedGame.sharedWithId,
      to: r.user.id,
    }),
    sharedGameRoles: r.many.sharedGameRole({
      from: r.sharedGame.id,
      to: r.sharedGameRole.sharedGameId,
    }),
    sharedMatches: r.many.sharedMatch({
      from: r.sharedGame.id,
      to: r.sharedMatch.sharedGameId,
    }),
    sharedScoresheets: r.many.sharedScoresheet({
      from: r.sharedGame.id,
      to: r.sharedScoresheet.sharedGameId,
      where: {
        type: "game",
      },
    }),
  },
  sharedLocation: {
    owner: r.one.user({
      from: r.sharedLocation.ownerId,
      to: r.user.id,
      optional: false,
    }),
    sharedWith: r.one.user({
      from: r.sharedLocation.sharedWithId,
      to: r.user.id,
      optional: false,
    }),
    location: r.one.location({
      from: r.sharedLocation.locationId,
      to: r.location.id,
      optional: false,
    }),
    linkedLocation: r.one.location({
      from: r.sharedLocation.linkedLocationId,
      to: r.location.id,
      where: {
        deletedAt: {
          isNull: true,
        },
      },
    }),
    sharedMatches: r.many.sharedMatch({
      from: r.sharedLocation.id,
      to: r.sharedMatch.sharedLocationId,
    }),
  },
  sharedPlayer: {
    player: r.one.player({
      from: r.sharedPlayer.playerId,
      to: r.player.id,
      optional: false,
    }),
    owner: r.one.user({
      from: r.sharedPlayer.ownerId,
      to: r.user.id,
      optional: false,
    }),
    sharedWith: r.one.user({
      from: r.sharedPlayer.sharedWithId,
      to: r.user.id,
      optional: false,
    }),
    linkedPlayer: r.one.player({
      from: r.sharedPlayer.linkedPlayerId,
      to: r.player.id,
      where: {
        deletedAt: {
          isNull: true,
        },
      },
    }),
    sharedMatches: r.many.sharedMatch({
      from: r.sharedPlayer.playerId.through(r.sharedMatchPlayer.sharedPlayerId),
      to: r.sharedMatch.id.through(r.sharedMatchPlayer.sharedMatchId),
    }),

    sharedMatchPlayers: r.many.sharedMatchPlayer({
      from: r.sharedPlayer.playerId.through(r.matchPlayer.playerId),
      to: r.sharedMatchPlayer.matchPlayerId.through(r.matchPlayer.id),
    }),
  },
  sharedMatch: {
    match: r.one.match({
      from: r.sharedMatch.matchId,
      to: r.match.id,
      optional: false,
    }),
    owner: r.one.user({
      from: r.sharedMatch.ownerId,
      to: r.user.id,
      optional: false,
    }),
    sharedWith: r.one.user({
      from: r.sharedMatch.sharedWithId,
      to: r.user.id,
      optional: false,
    }),
    sharedGame: r.one.sharedGame({
      from: r.sharedMatch.sharedGameId,
      to: r.sharedGame.id,
      optional: false,
    }),
    sharedScoresheet: r.one.sharedScoresheet({
      from: r.sharedMatch.sharedScoresheetId,
      to: r.sharedScoresheet.id,
      optional: false,
    }),
    sharedGamePassthrough: r.one.game({
      from: r.sharedMatch.sharedGameId.through(r.sharedGame.id),
      to: r.game.id.through(r.sharedGame.gameId),
      optional: false,
    }),
    sharedMatchPlayers: r.many.sharedMatchPlayer({
      from: r.sharedMatch.id,
      to: r.sharedMatchPlayer.sharedMatchId,
    }),
    sharedLocation: r.one.sharedLocation({
      from: r.sharedMatch.sharedLocationId,
      to: r.sharedLocation.id,
    }),
  },
  sharedGameRole: {
    sharedGame: r.one.sharedGame({
      from: r.sharedGameRole.sharedGameId,
      to: r.sharedGame.id,
      optional: false,
    }),
    gameRole: r.one.gameRole({
      from: r.sharedGameRole.gameRoleId,
      to: r.gameRole.id,
      optional: false,
    }),
    linkedGameRole: r.one.gameRole({
      from: r.sharedGameRole.linkedGameRoleId,
      to: r.gameRole.id,
      where: {
        deletedAt: {
          isNull: true,
        },
      },
    }),
    owner: r.one.user({
      from: r.sharedGameRole.ownerId,
      to: r.user.id,
      optional: false,
    }),
    sharedWith: r.one.user({
      from: r.sharedGameRole.sharedWithId,
      to: r.user.id,
      optional: false,
    }),
    sharedMatchPlayerRoles: r.many.sharedMatchPlayerRole({
      from: r.sharedGameRole.id,
      to: r.sharedMatchPlayerRole.sharedGameRoleId,
    }),
  },
  sharedMatchPlayerRole: {
    sharedMatchPlayer: r.one.sharedMatchPlayer({
      from: r.sharedMatchPlayerRole.sharedMatchPlayerId,
      to: r.sharedMatchPlayer.id,
      optional: false,
    }),
    sharedGameRole: r.one.sharedGameRole({
      from: r.sharedMatchPlayerRole.sharedGameRoleId,
      to: r.sharedGameRole.id,
      optional: false,
    }),
  },
  sharedScoresheet: {
    parent: r.one.sharedScoresheet({
      from: r.sharedScoresheet.parentId,
      to: r.sharedScoresheet.id,
      optional: true,
      where: {
        type: "game",
      },
    }),
    childScoresheets: r.many.sharedScoresheet({
      from: r.sharedScoresheet.id,
      to: r.sharedScoresheet.parentId,
      where: {
        type: "match",
      },
    }),
    owner: r.one.user({
      from: r.sharedScoresheet.ownerId,
      to: r.user.id,
      optional: false,
    }),
    sharedWith: r.one.user({
      from: r.sharedScoresheet.sharedWithId,
      to: r.user.id,
      optional: false,
    }),
    scoresheet: r.one.scoresheet({
      from: r.sharedScoresheet.scoresheetId,
      to: r.scoresheet.id,
      optional: false,
    }),
    linkedScoresheet: r.one.scoresheet({
      from: r.sharedScoresheet.linkedScoresheetId,
      to: r.scoresheet.id,
    }),
    sharedGame: r.one.sharedGame({
      from: r.sharedScoresheet.sharedGameId,
      to: r.sharedGame.id,
      optional: false,
    }),
    sharedGamePassthrough: r.one.game({
      from: r.sharedScoresheet.sharedGameId.through(r.sharedGame.id),
      to: r.game.id.through(r.sharedGame.gameId),
      optional: false,
    }),
  },
  shareRequest: {
    owner: r.one.user({
      from: r.shareRequest.ownerId,
      to: r.user.id,
      optional: false,
    }),
    sharedWith: r.one.user({
      from: r.shareRequest.sharedWithId,
      to: r.user.id,
    }),
    childShareRequests: r.many.shareRequest({
      from: r.shareRequest.id,
      to: r.shareRequest.parentShareId,
    }),
  },
}));
