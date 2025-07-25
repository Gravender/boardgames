import { defineRelations } from "drizzle-orm";

import * as schema from "../schema";

export const relations = defineRelations(schema, (r) => ({
  matchPlayer: {
    roles: r.many.gameRole({
      from: r.matchPlayer.id.through(r.matchPlayerRole.matchPlayerId),
      to: r.gameRole.id.through(r.matchPlayerRole.roleId),
    }),
    rounds: r.many.round({
      from: r.matchPlayer.id.through(r.roundPlayer.matchPlayerId),
      to: r.round.id.through(r.roundPlayer.roundId),
    }),
    playerRounds: r.many.roundPlayer({
      from: r.matchPlayer.id,
      to: r.roundPlayer.matchPlayerId,
    }),
    match: r.one.match({
      from: r.matchPlayer.matchId,
      to: r.match.id,
      optional: false,
    }),
    game: r.one.game({
      from: r.matchPlayer.matchId.through(r.match.gameId),
      to: r.game.id.through(r.match.gameId),
      where: {
        deletedAt: {
          isNull: true,
        },
      },
    }),
    player: r.one.player({
      from: r.matchPlayer.playerId,
      to: r.player.id,
      optional: false,
    }),
    team: r.one.team({
      from: r.matchPlayer.teamId,
      to: r.team.id,
    }),
    sharedMatchPlayers: r.many.sharedMatchPlayer({
      from: r.matchPlayer.id,
      to: r.sharedMatchPlayer.matchPlayerId,
    }),
  },
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
    match: r.one.match({
      from: r.sharedMatchPlayer.sharedMatchId.through(r.sharedMatch.id),
      to: r.match.id.through(r.sharedMatch.matchId),
      optional: false,
    }),
  },
  round: {
    matchPlayers: r.many.matchPlayer({
      from: r.round.id.through(r.roundPlayer.roundId),
      to: r.matchPlayer.id.through(r.roundPlayer.matchPlayerId),
    }),
    matchPlayerRounds: r.many.roundPlayer({
      from: r.round.id,
      to: r.roundPlayer.roundId,
    }),
    scoresheet: r.one.scoresheet({
      from: r.round.scoresheetId,
      to: r.scoresheet.id,
      optional: false,
    }),
    parent: r.one.round({
      from: r.round.parentId,
      to: r.round.id,
    }),
    childRounds: r.many.round({
      from: r.round.id,
      to: r.round.parentId,
    }),
  },
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
      to: r.image.userId,
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
      to: r.game.userId,
      where: {
        deletedAt: {
          isNull: true,
        },
      },
    }),
    matches: r.many.match({
      from: r.user.id,
      to: r.match.userId,
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
    friends: r.many.friend({
      from: r.user.id,
      to: r.friend.userId,
    }),
    friendSettings: r.many.friendSetting({
      from: r.user.id,
      to: r.friendSetting.createdById,
    }),
  },
  group: {
    createdBy: r.one.user({
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
    sharedMatches: r.many.sharedMatch({
      from: r.sharedGame.id,
      to: r.sharedMatch.sharedGameId,
    }),
    sharedScoresheets: r.many.sharedScoresheet({
      from: r.sharedGame.id,
      to: r.sharedScoresheet.sharedGameId,
    }),
    scoresheets: r.many.scoresheet({
      from: r.sharedGame.id.through(r.sharedScoresheet.sharedGameId),
      to: r.scoresheet.id.through(r.sharedScoresheet.scoresheetId),
    }),
  },
  game: {
    createdBy: r.one.user({
      from: r.game.userId,
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
  location: {
    createdBy: r.one.user({
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
  player: {
    createdBy: r.one.user({
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
  match: {
    createdBy: r.one.user({
      from: r.match.userId,
      to: r.user.id,
    }),
    game: r.one.game({
      from: r.match.gameId,
      to: r.game.id,
      optional: false,
    }),
    location: r.one.location({
      from: r.match.locationId,
      to: r.location.id,
      where: {
        deletedAt: {
          isNull: true,
        },
      },
    }),
    scoresheet: r.one.scoresheet({
      from: r.match.scoresheetId,
      to: r.scoresheet.id,
      optional: false,
    }),
    matchPlayers: r.many.matchPlayer({
      from: r.match.id,
      to: r.matchPlayer.matchId,
      where: {
        deletedAt: {
          isNull: true,
        },
      },
    }),
    players: r.many.player({
      from: r.match.id.through(r.matchPlayer.matchId),
      to: r.player.id.through(r.matchPlayer.playerId),
      where: {
        deletedAt: {
          isNull: true,
        },
      },
    }),
    teams: r.many.team({
      from: r.match.id,
      to: r.team.matchId,
    }),
    teamsWithPlayers: r.many.team({
      from: r.match.id.through(r.matchPlayer.matchId),
      to: r.team.id.through(r.matchPlayer.teamId),
    }),
    sharedMatches: r.many.sharedMatch({
      from: r.match.id,
      to: r.sharedMatch.matchId,
    }),
    matchImages: r.many.matchImage({
      from: r.match.id,
      to: r.matchImage.matchId,
    }),
  },
  sharedScoresheet: {
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
  scoresheet: {
    createdBy: r.one.user({
      from: r.scoresheet.userId,
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
  team: {
    matchPlayers: r.many.matchPlayer({
      from: r.team.id,
      to: r.matchPlayer.teamId,
    }),
    players: r.many.player({
      from: r.team.id.through(r.matchPlayer.teamId),
      to: r.player.id.through(r.matchPlayer.playerId),
      where: {
        deletedAt: {
          isNull: true,
        },
      },
    }),
    match: r.one.match({
      from: r.team.matchId,
      to: r.match.id,
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
  matchImage: {
    match: r.one.match({
      from: r.matchImage.matchId,
      to: r.match.id,
      optional: false,
    }),
    image: r.one.image({
      from: r.matchImage.imageId,
      to: r.image.id,
      optional: false,
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
  },
}));
