import { defineRelations, or } from "drizzle-orm";

import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  matchPlayer: {
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
    }),
    game: r.one.game({
      from: r.matchPlayer.matchId.through(r.match.gameId),
      to: r.game.id.through(r.match.gameId),
      where: {
        deleted: false,
      },
    }),
    player: r.one.player({
      from: r.matchPlayer.playerId,
      to: r.player.id,
    }),
    team: r.one.team({
      from: r.matchPlayer.teamId,
      to: r.team.id,
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
    }),
    linkedPlayers: r.many.player({
      from: r.user.id,
      to: r.player.userId,
    }),
    createdPlayers: r.many.player({
      from: r.user.id,
      to: r.player.createdBy,
    }),
    games: r.many.game({
      from: r.user.id,
      to: r.game.userId,
    }),
    matches: r.many.match({
      from: r.user.id,
      to: r.match.userId,
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
    shareRequestsReceived: r.many.shareRequest({
      from: r.user.id,
      to: r.shareRequest.sharedWithId,
    }),
    shareRequestsSent: r.many.shareRequest({
      from: r.user.id,
      to: r.shareRequest.ownerId,
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
    }),
  },
  sharedGame: {
    game: r.one.game({
      from: r.sharedGame.gameId,
      to: r.game.id,
    }),
    owner: r.one.user({
      from: r.sharedGame.ownerId,
      to: r.user.id,
    }),
    sharedWith: r.one.user({
      from: r.sharedGame.sharedWithId,
      to: r.user.id,
    }),
    sharedMatches: r.many.sharedMatch({
      from: r.sharedGame.id.through(r.sharedMatch.sharedGameId),
      to: r.sharedMatch.id.through(r.sharedMatch.sharedGameId),
    }),
    sharedScoresheets: r.many.sharedScoresheet({
      from: r.sharedGame.id.through(r.sharedScoresheet.sharedGameId),
      to: r.sharedScoresheet.id.through(r.sharedScoresheet.sharedGameId),
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
    }),
    finishedMatches: r.many.match({
      from: r.game.id,
      to: r.match.gameId,
      where: {
        finished: true,
      },
    }),
    sharedGameMatches: r.many.sharedMatch({
      from: r.game.id.through(r.sharedGame.linkedGameId),
      to: r.sharedMatch.sharedGameId.through(r.sharedGame.id),
    }),
    scoresheets: r.many.scoresheet({
      from: r.game.id,
      to: r.scoresheet.gameId,
      where: {
        OR: [{ type: "Default" }, { type: "Game" }],
      },
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
    }),
  },
  player: {
    createdBy: r.one.user({
      from: r.player.createdBy,
      to: r.user.id,
    }),
    image: r.one.image({
      from: r.player.imageId,
      to: r.image.id,
    }),
    linkedUser: r.one.user({
      from: r.player.userId,
      to: r.user.id,
    }),
    matches: r.many.match({
      from: r.player.id.through(r.matchPlayer.playerId),
      to: r.match.id.through(r.matchPlayer.matchId),
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
    }),
  },
  sharedPlayer: {
    player: r.one.player({
      from: r.sharedPlayer.playerId,
      to: r.player.id,
    }),
    owner: r.one.user({
      from: r.sharedPlayer.ownerId,
      to: r.user.id,
    }),
    sharedWith: r.one.user({
      from: r.sharedPlayer.sharedWithId,
      to: r.user.id,
    }),
    linkedPlayer: r.one.player({
      from: r.sharedPlayer.linkedPlayerId,
      to: r.player.id,
    }),
    sharedMatches: r.many.sharedMatch({
      from: r.sharedPlayer.playerId.through(r.matchPlayer.playerId),
      to: r.sharedMatch.matchId.through(r.matchPlayer.matchId),
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
    }),
    owner: r.one.user({
      from: r.sharedMatch.ownerId,
      to: r.user.id,
    }),
    sharedWith: r.one.user({
      from: r.sharedMatch.sharedWithId,
      to: r.user.id,
    }),
    sharedGame: r.one.sharedGame({
      from: r.sharedMatch.sharedGameId,
      to: r.sharedGame.id,
    }),
    sharedGamePassthrough: r.one.game({
      from: r.sharedMatch.sharedGameId.through(r.sharedGame.id),
      to: r.game.id.through(r.sharedGame.gameId),
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
      where: {
        deleted: false,
      },
    }),
    location: r.one.location({
      from: r.match.locationId,
      to: r.location.id,
    }),
    scoresheet: r.one.scoresheet({
      from: r.match.scoresheetId,
      to: r.scoresheet.id,
    }),
    matchPlayers: r.many.matchPlayer({
      from: r.match.id,
      to: r.matchPlayer.matchId,
    }),
    players: r.many.player({
      from: r.match.id.through(r.matchPlayer.matchId),
      to: r.player.id.through(r.matchPlayer.playerId),
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
  },
  sharedScoresheet: {
    owner: r.one.user({
      from: r.sharedScoresheet.ownerId,
      to: r.user.id,
    }),
    sharedWith: r.one.user({
      from: r.sharedScoresheet.sharedWithId,
      to: r.user.id,
    }),
    scoresheet: r.one.scoresheet({
      from: r.sharedScoresheet.scoresheetId,
      to: r.scoresheet.id,
    }),
    sharedGame: r.one.sharedGame({
      from: r.sharedScoresheet.sharedGameId,
      to: r.sharedGame.id,
    }),
    sharedGamePassthrough: r.one.game({
      from: r.sharedScoresheet.sharedGameId.through(r.sharedGame.id),
      to: r.game.id.through(r.sharedGame.gameId),
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
  },
  team: {
    matchPlayers: r.many.matchPlayer({
      from: r.team.id.through(r.matchPlayer.teamId),
      to: r.matchPlayer.id.through(r.matchPlayer.teamId),
    }),
    players: r.many.player({
      from: r.team.id.through(r.matchPlayer.teamId),
      to: r.player.id.through(r.matchPlayer.playerId),
    }),
    match: r.one.match({
      from: r.team.matchId,
      to: r.match.id,
    }),
  },
  shareRequest: {
    owner: r.one.user({
      from: r.shareRequest.ownerId,
      to: r.user.id,
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
