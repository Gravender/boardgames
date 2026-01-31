import { defineRelationsPart } from "drizzle-orm";

import * as schema from "../schema";

export const matchRelations = defineRelationsPart(schema, (r) => ({
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
    sharedRounds: r.many.sharedRound({
      from: r.round.id,
      to: r.sharedRound.roundId,
    }),
    linkedSharedRounds: r.many.sharedRound({
      from: r.round.id,
      to: r.sharedRound.linkedRoundId,
    }),
  },
  match: {
    creator: r.one.user({
      from: r.match.createdBy,
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
}));
