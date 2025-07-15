import type z from "zod/v4";

import type {
  roundTypes,
  scoreSheetRoundsScore,
  scoreSheetWinConditions,
} from "@board-games/db/constants";
import type { selectScoreSheetSchema } from "@board-games/db/zodSchema";
import { combinations } from "@board-games/shared";

export function updateRoundStatistics(
  playerRounds: {
    id: number;
    roundId: number;
    score: number | null;
  }[],
  scoresheetRounds: {
    id: number;
    parentId: number | null;
    name: string;
    type: (typeof roundTypes)[number];
    score: number;
    order: number;
  }[],
  winCondition: (typeof scoreSheetWinConditions)[number],
  matchDate: Date,
  isWinner: boolean,
) {
  const tempPlayerRounds: Record<
    number,
    {
      id: number;
      bestScore: number | null;
      worstScore: number | null;
      scores: { date: Date; score: number | null; isWin: boolean }[];
    }
  > = {};

  playerRounds.forEach((pRound) => {
    const foundRound = scoresheetRounds.find(
      (round) => round.id === pRound.roundId,
    );
    if (foundRound?.parentId) {
      const tempPlayerRound = tempPlayerRounds[foundRound.parentId];
      if (!tempPlayerRound) {
        tempPlayerRounds[foundRound.parentId] = {
          id: foundRound.parentId,
          bestScore:
            winCondition === "Lowest Score" || winCondition === "Highest Score"
              ? pRound.score
              : null,
          worstScore:
            winCondition === "Lowest Score" || winCondition === "Highest Score"
              ? pRound.score
              : null,
          scores: [
            {
              date: matchDate,
              score: pRound.score,
              isWin: isWinner,
            },
          ],
        };
      } else {
        if (pRound.score !== null) {
          if (winCondition === "Lowest Score") {
            tempPlayerRound.bestScore = tempPlayerRound.bestScore
              ? Math.min(tempPlayerRound.bestScore, pRound.score)
              : pRound.score;
            tempPlayerRound.worstScore = tempPlayerRound.worstScore
              ? Math.max(tempPlayerRound.worstScore, pRound.score)
              : pRound.score;
          } else if (winCondition === "Highest Score") {
            tempPlayerRound.bestScore = tempPlayerRound.bestScore
              ? Math.max(tempPlayerRound.bestScore, pRound.score)
              : pRound.score;
            tempPlayerRound.worstScore = tempPlayerRound.worstScore
              ? Math.min(tempPlayerRound.worstScore, pRound.score)
              : pRound.score;
          }
        }
        tempPlayerRound.scores.push({
          date: matchDate,
          score: pRound.score,
          isWin: isWinner,
        });
      }
    }
  });

  return tempPlayerRounds;
}
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Player = {
  id: number;
  type: "original" | "shared";
  name: string;
  isWinner: boolean | null;
  isUser: boolean;
  score: number | null;
  placement: number;
  image: {
    name: string;
    url: string | null;
    type: "file" | "svg";
    usageType: "player" | "match" | "game";
  } | null;
  team: {
    id: number;
    name: string;
    matchId: number;
    details: string | null;
    createdAt: Date;
    updatedAt: Date | null;
  } | null;
  playerRounds: {
    id: number;
    roundId: number;
    score: number | null;
  }[];
  roles: {
    id: number;
    name: string;
    description: string | null;
  }[];
};
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PlayerMatch = {
  type: "original" | "shared";
  id: number;
  gameId: number;
  date: Date;
  location: {
    type: "shared" | "linked" | "original";
    name: string;
  } | null;
  won: boolean;
  placement: number | null;
  score: number | null;
  name: string;
  duration: number;
  finished: boolean;
  comment: string | null;
  scoresheet: {
    id: number;
    parentId: number | null;
    winCondition: (typeof scoreSheetWinConditions)[number];
    roundScore: (typeof scoreSheetRoundsScore)[number];
    targetScore: z.infer<typeof selectScoreSheetSchema>["targetScore"];
    isCoop: z.infer<typeof selectScoreSheetSchema>["isCoop"];
    rounds: {
      id: number;
      parentId: number | null;
      name: string;
      type: (typeof roundTypes)[number];
      score: number;
      order: number;
    }[];
  };
  players: Player[];
  winners: {
    id: number;
    name: string;
    isWinner: boolean | null;
    score: number | null;
    team: {
      id: number;
      name: string;
      matchId: number;
      details: string | null;
      createdAt: Date;
      updatedAt: Date | null;
    } | null;
  }[];
};
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type OriginalMatch = {
  id: number;
  name: string;
  userId: number | null;
  gameId: number;
  finished: boolean;
  comment: string | null;
  duration: number;
  scoresheetId: number;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
  date: Date;
  location: {
    id: number;
    name: string;
    isDefault: boolean;
    createdBy: number;
    createdAt: Date;
    updatedAt: Date | null;
    deletedAt: Date | null;
  } | null;
  matchPlayers: {
    id: number;
    matchId: number;
    playerId: number;
    teamId: number | null;
    winner: boolean | null;
    score: number | null;
    placement: number | null;
    order: number | null;
    details: string | null;
    roles: {
      id: number;
      name: string;
      description: string | null;
      gameId: number;
      createdBy: number;
      createdAt: Date;
      updatedAt: Date | null;
      deletedAt: Date | null;
    }[];
    playerRounds: {
      id: number;
      score: number | null;
      roundId: number;
      matchPlayerId: number;
      createdAt: Date;
      updatedAt: Date | null;
    }[];
    player: {
      id: number;
      createdBy: number;
      isUser: boolean;
      friendId: number | null;
      name: string;
      imageId: number | null;
      createdAt: Date;
      updatedAt: Date | null;
      deletedAt: Date | null;
      image: {
        id: number;
        userId: number | null;
        name: string;
        url: string | null;
        fileId: string | null;
        fileSize: number | null;
        type: "file" | "svg";
        usageType: "game" | "match" | "player";
        createdAt: Date;
        updatedAt: Date | null;
        deletedAt: Date | null;
      } | null;
    };
    team: {
      id: number;
      name: string;
      matchId: number;
      details: string | null;
      createdAt: Date;
      updatedAt: Date | null;
    } | null;
  }[];
  scoresheet: {
    id: number;
    parentId: number | null;
    name: string;
    gameId: number;
    userId: number | null;
    createdAt: Date;
    updatedAt: Date | null;
    deletedAt: Date | null;
    winCondition: (typeof scoreSheetWinConditions)[number];
    roundsScore: (typeof scoreSheetRoundsScore)[number];
    targetScore: number;
    isCoop: boolean;
    rounds: {
      id: number;
      parentId: number | null;
      name: string;
      scoresheetId: number;
      type: "Numeric" | "Checkbox";
      color: string | null;
      score: number;
      winCondition: number | null;
      toggleScore: number | null;
      updatedAt: Date | null;
      order: number;
    }[];
  };
};
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type SharedMatch = {
  id: number;
  ownerId: number;
  sharedWithId: number;
  matchId: number;
  sharedGameId: number;
  sharedLocationId: number | null;
  permission: "view" | "edit";
  createdAt: Date;
  updatedAt: Date | null;
  match: {
    id: number;
    name: string;
    userId: number | null;
    gameId: number;
    scoresheetId: number;
    createdAt: Date;
    updatedAt: Date | null;
    deletedAt: Date | null;
    date: Date;
    comment: string | null;
    duration: number;
    finished: boolean;
    scoresheet: {
      id: number;
      parentId: number | null;
      name: string;
      gameId: number;
      userId: number | null;
      createdAt: Date;
      updatedAt: Date | null;
      deletedAt: Date | null;
      winCondition: (typeof scoreSheetWinConditions)[number];
      roundsScore: (typeof scoreSheetRoundsScore)[number];
      targetScore: number;
      isCoop: boolean;
      rounds: {
        id: number;
        parentId: number | null;
        name: string;
        scoresheetId: number;
        type: "Numeric" | "Checkbox";
        color: string | null;
        score: number;
        winCondition: number | null;
        toggleScore: number | null;
        updatedAt: Date | null;
        order: number;
      }[];
    };
  };
  sharedLocation: {
    id: number;
    ownerId: number;
    sharedWithId: number;
    locationId: number;
    linkedLocationId: number | null;
    isDefault: boolean;
    permission: "view" | "edit";
    createdAt: Date;
    updatedAt: Date | null;
    location: {
      id: number;
      name: string;
      isDefault: boolean;
      createdBy: number;
      createdAt: Date;
      updatedAt: Date | null;
      deletedAt: Date | null;
    };
    linkedLocation: {
      id: number;
      name: string;
      isDefault: boolean;
      createdBy: number;
      createdAt: Date;
      updatedAt: Date | null;
      deletedAt: Date | null;
    } | null;
  } | null;
  sharedMatchPlayers: {
    id: number;
    ownerId: number;
    sharedWithId: number;
    matchPlayerId: number;
    sharedMatchId: number;
    sharedPlayerId: number | null;
    permission: "view" | "edit";
    createdAt: Date;
    updatedAt: Date | null;
    matchPlayer: {
      id: number;
      matchId: number;
      playerId: number;
      teamId: number | null;
      winner: boolean | null;
      score: number | null;
      placement: number | null;
      order: number | null;
      details: string | null;
      team: {
        id: number;
        name: string;
        matchId: number;
        details: string | null;
        createdAt: Date;
        updatedAt: Date | null;
      } | null;
      playerRounds: {
        id: number;
        score: number | null;
        roundId: number;
        matchPlayerId: number;
        createdAt: Date;
        updatedAt: Date | null;
      }[];
      roles: {
        id: number;
        name: string;
        description: string | null;
        gameId: number;
        createdBy: number;
        createdAt: Date;
        updatedAt: Date | null;
        deletedAt: Date | null;
      }[];
    };
    sharedPlayer: {
      id: number;
      ownerId: number;
      sharedWithId: number;
      playerId: number;
      linkedPlayerId: number | null;
      permission: "view" | "edit";
      createdAt: Date;
      updatedAt: Date | null;
      player: {
        id: number;
        createdBy: number;
        isUser: boolean;
        friendId: number | null;
        name: string;
        imageId: number | null;
        createdAt: Date;
        updatedAt: Date | null;
        deletedAt: Date | null;
        image: {
          id: number;
          userId: number | null;
          name: string;
          url: string | null;
          fileId: string | null;
          fileSize: number | null;
          type: "file" | "svg";
          usageType: "match" | "game" | "player";
          createdAt: Date;
          updatedAt: Date | null;
          deletedAt: Date | null;
        } | null;
      };
      linkedPlayer: {
        id: number;
        createdBy: number;
        isUser: boolean;
        friendId: number | null;
        name: string;
        imageId: number | null;
        createdAt: Date;
        updatedAt: Date | null;
        deletedAt: Date | null;
        image: {
          id: number;
          userId: number | null;
          name: string;
          url: string | null;
          fileId: string | null;
          fileSize: number | null;
          type: "file" | "svg";
          usageType: "match" | "game" | "player";
          createdAt: Date;
          updatedAt: Date | null;
          deletedAt: Date | null;
        } | null;
      } | null;
    } | null;
  }[];
};
export function matchesAggregated(
  originalMatches: OriginalMatch[],
  sharedGameMatches: SharedMatch[],
) {
  const matches: PlayerMatch[] = [];
  originalMatches.forEach((match) => {
    const winners = match.matchPlayers.filter((player) => player.winner);
    const foundPlayer = match.matchPlayers.find((p) => p.player.isUser);
    matches.push({
      type: "original" as const,
      id: match.id,
      gameId: match.gameId,
      date: match.date,
      location: match.location
        ? {
            type: "original" as const,
            name: match.location.name,
          }
        : null,
      won: match.finished ? (foundPlayer?.winner ?? false) : false,
      placement: match.finished ? (foundPlayer?.placement ?? null) : null,
      score: match.finished ? (foundPlayer?.score ?? null) : null,
      name: match.name,
      comment: match.comment,
      duration: match.duration,
      finished: match.finished,
      scoresheet: {
        id: match.scoresheet.id,
        parentId: match.scoresheet.parentId,
        winCondition: match.scoresheet.winCondition,
        roundScore: match.scoresheet.roundsScore,
        targetScore: match.scoresheet.targetScore,
        isCoop: match.scoresheet.isCoop,
        rounds: match.scoresheet.rounds.map((round) => ({
          id: round.id,
          parentId: round.parentId,
          name: round.name,
          type: round.type,
          score: round.score,
          order: round.order,
        })),
      },
      players: match.matchPlayers.map((player) => {
        return {
          id: player.player.id,
          type: "original" as const,
          name: player.player.name,
          isWinner: player.winner,
          isUser: player.player.isUser,
          score: player.score,
          image: player.player.image,
          team: player.team,
          placement: player.placement ?? 0,
          playerRounds: player.playerRounds.map((round) => ({
            id: round.id,
            roundId: round.roundId,
            score: round.score,
          })),
          roles: player.roles.map((role) => ({
            id: role.id,
            name: role.name,
            description: role.description,
          })),
        };
      }),
      winners: winners.map((player) => {
        return {
          id: player.player.id,
          name: player.player.name,
          isWinner: player.winner,
          score: player.score,
          team: player.team,
        };
      }),
    });
  });
  sharedGameMatches.forEach((sharedMatch) => {
    const winners = sharedMatch.sharedMatchPlayers.filter(
      (returnedSharedMatchPlayer) =>
        returnedSharedMatchPlayer.matchPlayer.winner,
    );
    const foundSharedPlayer = sharedMatch.sharedMatchPlayers.find(
      (p) => p.sharedPlayer?.linkedPlayer?.isUser,
    )?.matchPlayer;
    const mSharedLocation = sharedMatch.sharedLocation;
    const mLinkedLocation = mSharedLocation?.linkedLocation;
    const mappedShareMatch = {
      type: "shared" as const,
      id: sharedMatch.id,
      gameId: sharedMatch.sharedGameId,
      name: sharedMatch.match.name,
      comment: sharedMatch.match.comment,
      date: sharedMatch.match.date,
      location: mSharedLocation
        ? {
            type: mLinkedLocation ? ("linked" as const) : ("shared" as const),
            name: mLinkedLocation?.name ?? mSharedLocation.location.name,
          }
        : null,
      duration: sharedMatch.match.duration,
      finished: sharedMatch.match.finished,
      scoresheet: {
        id: sharedMatch.match.scoresheet.id,
        parentId: sharedMatch.match.scoresheet.parentId,
        winCondition: sharedMatch.match.scoresheet.winCondition,
        roundScore: sharedMatch.match.scoresheet.roundsScore,
        targetScore: sharedMatch.match.scoresheet.targetScore,
        isCoop: sharedMatch.match.scoresheet.isCoop,
        rounds: sharedMatch.match.scoresheet.rounds.map((round) => ({
          id: round.id,
          parentId: round.parentId,
          name: round.name,
          type: round.type,
          score: round.score,
          order: round.order,
        })),
      },
      won: sharedMatch.match.finished
        ? (foundSharedPlayer?.winner ?? false)
        : false,
      placement: sharedMatch.match.finished
        ? (foundSharedPlayer?.placement ?? null)
        : null,
      score: sharedMatch.match.finished
        ? (foundSharedPlayer?.score ?? null)
        : null,
      players: sharedMatch.sharedMatchPlayers
        .map((returnedSharedMatchPlayer) => {
          if (returnedSharedMatchPlayer.sharedPlayer === null) return null;
          const linkedPlayer =
            returnedSharedMatchPlayer.sharedPlayer.linkedPlayer;
          return {
            type:
              linkedPlayer !== null
                ? ("original" as const)
                : ("shared" as const),
            id:
              linkedPlayer !== null
                ? linkedPlayer.id
                : returnedSharedMatchPlayer.sharedPlayer.playerId,
            name:
              linkedPlayer !== null
                ? linkedPlayer.name
                : returnedSharedMatchPlayer.sharedPlayer.player.name,
            isUser: linkedPlayer?.isUser ?? false,
            isWinner: returnedSharedMatchPlayer.matchPlayer.winner,
            score: returnedSharedMatchPlayer.matchPlayer.score,
            placement: returnedSharedMatchPlayer.matchPlayer.placement ?? 0,
            team: returnedSharedMatchPlayer.matchPlayer.team,
            image:
              linkedPlayer !== null
                ? linkedPlayer.image
                : returnedSharedMatchPlayer.sharedPlayer.player.image,
            playerRounds:
              returnedSharedMatchPlayer.matchPlayer.playerRounds.map(
                (round) => ({
                  id: round.id,
                  roundId: round.roundId,
                  score: round.score,
                }),
              ),
            roles: returnedSharedMatchPlayer.matchPlayer.roles.map((role) => ({
              id: role.id,
              name: role.name,
              description: role.description,
            })),
          };
        })
        .filter((player) => player !== null),
      winners: winners
        .map((returnedSharedMatchPlayer) => {
          if (returnedSharedMatchPlayer.sharedPlayer === null) return null;
          const linkedPlayer =
            returnedSharedMatchPlayer.sharedPlayer.linkedPlayer;
          return {
            type: "shared" as const,
            id: returnedSharedMatchPlayer.sharedPlayer.playerId,
            name:
              linkedPlayer !== null
                ? linkedPlayer.name
                : returnedSharedMatchPlayer.sharedPlayer.player.name,
            isWinner: returnedSharedMatchPlayer.matchPlayer.winner,
            score: returnedSharedMatchPlayer.matchPlayer.score,
            team: returnedSharedMatchPlayer.matchPlayer.team,
          };
        })
        .filter((winner) => winner !== null),
    };
    matches.push(mappedShareMatch);
  });
  return matches;
}
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Roles = {
  id: number;
  name: string;
  description: string | null;
  gameId: number;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
};
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type RolePlayerStats = {
  id: number;
  name: string;
  isUser: boolean;
  image: {
    name: string;
    url: string | null;
    type: "file" | "svg";
    usageType: "player" | "match" | "game";
  } | null;
  totalMatches: number;
  matchIds: Set<number>;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  placements: Record<number, number>;
};
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type RoleStats = {
  roleId: number;
  name: string;
  description: string | null;
  playerCount: number;
  matchCount: number;
  winRate: number;
  wins: number;
  losses: number;
  placements: Record<number, number>;
  players: Record<string, RolePlayerStats>;
};
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ComboRoleStats = {
  roles: {
    id: number;
    name: string;
    description: string | null;
  }[];
  matchCount: number;
  matchIds: Set<number>;
  wins: number;
  losses: number;
  players: Set<string>;
  winRate: number;
  placements: Record<number, number>;
};
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type PlayerScoresheetStats = {
  id: number;
  bestScore: number | null;
  worstScore: number | null;
  scores: {
    date: Date;
    score: number | null;
    isWin: boolean;
  }[];
  winRate: number;
  plays: number;
  wins: number;
  placements: Record<number, number>;
  rounds: Record<
    number,
    {
      id: number;
      bestScore: number | null;
      worstScore: number | null;
      scores: {
        date: Date;
        score: number | null;
        isWin: boolean;
      }[];
    }
  >;
};
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type PlayerRoleStats = {
  roleId: number;
  name: string;
  description: string | null;
  matchIds: Set<number>;
  winRate: number;
  wins: number;
  losses: number;
  placements: Record<number, number>;
};
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type PlayerRoleComboStats = {
  roles: {
    id: number;
    name: string;
    description: string | null;
  }[];
  matchIds: Set<number>;
  wins: number;
  losses: number;
  winRate: number;
  placements: Record<number, number>;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type PlayerStats = {
  id: number;
  type: "original" | "shared";
  name: string;
  isUser: boolean;
  coopWinRate: number;
  competitiveWins: number;
  coopWins: number;
  competitiveWinRate: number;
  coopMatches: number;
  competitiveMatches: number;
  coopScores: {
    date: Date;
    score: number | null;
    isWin: boolean;
  }[];
  competitiveScores: {
    date: Date;
    score: number | null;
    isWin: boolean;
  }[];
  image: {
    name: string;
    url: string | null;
    type: "file" | "svg";
    usageType: "player" | "match" | "game";
  } | null;
  placements: Record<number, number>;
  streaks: {
    current: { type: "win" | "loss"; count: number };
    longest: { wins: number; losses: number };
  };
  recentForm: ("win" | "loss")[];
  playerCount: Record<
    number,
    {
      playerCount: number;
      placements: Record<number, number>;
      wins: number;
      plays: number;
    }
  >;
  scoresheets: Record<number, PlayerScoresheetStats>;
  roles: Record<number, PlayerRoleStats>;
  roleCombos: Record<string, PlayerRoleComboStats>;
};
export function playerAndRolesAggregated(
  playerMatches: PlayerMatch[],
  gameRoles: Roles[],
) {
  const roleStats = gameRoles.reduce(
    (acc, role) => {
      acc[role.id] = {
        roleId: role.id,
        name: role.name,
        description: role.description,
        playerCount: 0,
        matchCount: 0,
        matchIds: new Set(),
        winRate: 0,
        wins: 0,
        losses: 0,
        placements: {},
        players: {},
      };
      return acc;
    },
    {} as Record<number, RoleStats & { matchIds: Set<number> }>,
  );
  const comboRoles: Record<string, ComboRoleStats> = {};
  const players = playerMatches.reduce(
    (acc, match) => {
      if (!match.finished) return acc;
      const currentScoresheet = match.scoresheet;
      const isCoop = currentScoresheet.isCoop;
      match.players.forEach((player) => {
        updateRoleStats(roleStats, player, match);
        updatePlayerStats(acc, player, match, isCoop, currentScoresheet);
        if (player.roles.length >= 2) {
          const accPlayer = acc[`${player.type}-${player.id}`];
          updateComboRoles(comboRoles, accPlayer, player, match);
        }
      });
      return acc;
    },
    {} as Record<string, PlayerStats>,
  );
  return {
    roleStats: Object.values(roleStats).map((role) => ({
      ...role,
      players: Object.values(role.players).map((player) => ({
        ...player,
        matchCount: player.matchIds.size,
        winRate: player.totalWins / (player.totalWins + player.totalLosses),
      })),
      winRate: role.wins / (role.wins + role.losses),
      playerCount: Object.values(role.players).length,
      matchCount: role.matchIds.size,
    })),
    comboRolesStats: Object.values(comboRoles).map((combo) => ({
      ...combo,
      winRate: combo.wins / (combo.wins + combo.losses),
      playerCount: combo.players.size,
      matchCount: combo.matchIds.size,
    })),
    playerStats: Object.values(players).map((player) => ({
      ...player,
      coopWinRate:
        player.coopMatches > 0 ? player.coopWins / player.coopMatches : 0,
      competitiveWinRate:
        player.competitiveMatches > 0
          ? player.competitiveWins / player.competitiveMatches
          : 0,
      scoresheets: Object.values(player.scoresheets).map((scoresheet) => {
        const sumScores = scoresheet.scores.reduce<number | null>(
          (acc, score) => {
            if (acc === null) return score.score;
            if (score.score === null) return acc;
            return acc + score.score;
          },
          null,
        );
        return {
          ...scoresheet,
          avgScore: sumScores ? sumScores / scoresheet.scores.length : null,
          rounds: Object.values(scoresheet.rounds).map((round) => {
            const sumScores = round.scores.reduce<number | null>(
              (acc, score) => {
                if (acc === null) return score.score;
                if (score.score === null) return acc;
                return acc + score.score;
              },
              null,
            );
            return {
              avgScore: sumScores ? sumScores / round.scores.length : null,
              ...round,
            };
          }),
          winRate:
            scoresheet.plays > 0 ? scoresheet.wins / scoresheet.plays : 0,
        };
      }),
      roles: Object.values(player.roles).map((role) => ({
        ...role,
        winRate: role.wins / (role.wins + role.losses),
        matchCount: role.matchIds.size,
      })),
      roleCombos: Object.values(player.roleCombos).map((combo) => ({
        ...combo,
        winRate: combo.wins / (combo.wins + combo.losses),
        matchCount: combo.matchIds.size,
      })),
    })),
  };
}
function updateRoleStats(
  roleStats: Record<number, RoleStats & { matchIds: Set<number> }>,
  player: Player,
  match: PlayerMatch,
) {
  player.roles.forEach((role) => {
    const accRole = roleStats[role.id];
    if (!accRole) {
      roleStats[role.id] = {
        roleId: role.id,
        name: role.name,
        description: role.description,
        playerCount: 1,
        placements: player.placement > 0 ? { [player.placement]: 1 } : {},
        wins: player.isWinner ? 1 : 0,
        losses: player.isWinner ? 0 : 1,
        matchCount: 1,
        matchIds: new Set([match.id]),
        winRate: player.isWinner ? 1 : 0,
        players: {
          [`${player.type}-${player.id}`]: {
            id: player.id,
            name: player.name,
            isUser: player.isUser,
            image: player.image,
            totalMatches: 1,
            matchIds: new Set([match.id]),
            totalWins: player.isWinner ? 1 : 0,
            totalLosses: player.isWinner ? 0 : 1,
            winRate: player.isWinner ? 1 : 0,
            placements: player.placement > 0 ? { [player.placement]: 1 } : {},
          },
        },
      };
    } else {
      accRole.playerCount++;
      if (player.placement > 0) {
        accRole.placements[player.placement] =
          (accRole.placements[player.placement] ?? 0) + 1;
      }
      accRole.wins += player.isWinner ? 1 : 0;
      accRole.losses += player.isWinner ? 0 : 1;
      accRole.matchIds.add(match.id);
      accRole.winRate = accRole.wins / (accRole.wins + accRole.losses);
      const accPlayer = accRole.players[`${player.type}-${player.id}`];
      if (!accPlayer) {
        accRole.players[`${player.type}-${player.id}`] = {
          id: player.id,
          name: player.name,
          isUser: player.isUser,
          image: player.image,
          totalMatches: 1,
          matchIds: new Set([match.id]),
          totalWins: player.isWinner ? 1 : 0,
          totalLosses: player.isWinner ? 0 : 1,
          winRate: player.isWinner ? 1 : 0,
          placements: player.placement > 0 ? { [player.placement]: 1 } : {},
        };
      } else {
        accPlayer.totalWins += player.isWinner ? 1 : 0;
        accPlayer.totalLosses += player.isWinner ? 0 : 1;
        accPlayer.winRate =
          accPlayer.totalWins / (accPlayer.totalWins + accPlayer.totalLosses);
        accPlayer.matchIds.add(match.id);
        if (player.placement > 0) {
          accPlayer.placements[player.placement] =
            (accPlayer.placements[player.placement] ?? 0) + 1;
        }
      }
    }
  });
}
function updatePlayerStats(
  acc: Record<string, PlayerStats>,
  player: Player,
  match: PlayerMatch,
  isCoop: boolean,
  currentScoresheet: PlayerMatch["scoresheet"],
) {
  const accPlayer = acc[`${player.type}-${player.id}`];
  if (!accPlayer) {
    const tempPlacements: Record<number, number> = {};
    const tempPlayerCount: Record<
      number,
      {
        playerCount: number;
        placements: Record<number, number>;
        wins: number;
        plays: number;
      }
    > = {};
    const tempScoresheets: Record<number, PlayerScoresheetStats> = {};

    if (!isCoop) {
      tempPlacements[player.placement] = 1;
      tempPlayerCount[match.players.length] = {
        playerCount: match.players.length,
        placements: {
          [player.placement]: 1,
        },
        wins: player.isWinner ? 1 : 0,
        plays: 1,
      };
    }
    if (currentScoresheet.parentId) {
      const tempPlayerRounds = updateRoundStatistics(
        player.playerRounds,
        currentScoresheet.rounds,
        currentScoresheet.winCondition,
        match.date,
        player.isWinner ?? false,
      );
      tempScoresheets[currentScoresheet.parentId] = {
        id: currentScoresheet.parentId,
        bestScore: player.score,
        worstScore: player.score,
        scores: [
          {
            date: match.date,
            score: player.score,
            isWin: player.isWinner ?? false,
          },
        ],
        winRate: player.isWinner ? 1 : 0,
        plays: 1,
        wins: player.isWinner ? 1 : 0,
        placements: !isCoop ? tempPlacements : {},
        rounds: tempPlayerRounds,
      };
    }
    acc[`${player.type}-${player.id}`] = {
      id: player.id,
      type: player.type,
      name: player.name,
      isUser: player.isUser,
      coopWins: player.isWinner && isCoop ? 1 : 0,
      competitiveWins: player.isWinner && !isCoop ? 1 : 0,
      coopWinRate: player.isWinner && isCoop ? 1 : 0,
      competitiveWinRate: player.isWinner && !isCoop ? 1 : 0,
      coopMatches: isCoop ? 1 : 0,
      competitiveMatches: !isCoop ? 1 : 0,
      coopScores: isCoop
        ? [
            {
              date: match.date,
              score: player.score,
              isWin: player.isWinner ?? false,
            },
          ]
        : [],
      competitiveScores: !isCoop
        ? [
            {
              date: match.date,
              score: player.score,
              isWin: player.isWinner ?? false,
            },
          ]
        : [],
      image: player.image,
      placements: !isCoop ? tempPlacements : {},
      streaks: {
        current: {
          type: player.isWinner ? "win" : "loss",
          count: 1,
        },
        longest: {
          wins: player.isWinner ? 1 : 0,
          losses: player.isWinner ? 0 : 1,
        },
      },
      recentForm: player.isWinner ? ["win"] : ["loss"],
      playerCount: !isCoop ? tempPlayerCount : {},
      scoresheets: tempScoresheets,
      roles: player.roles.reduce(
        (acc, role) => {
          acc[role.id] = {
            roleId: role.id,
            name: role.name,
            description: role.description,
            matchIds: new Set([match.id]),
            winRate: player.isWinner ? 1 : 0,
            losses: player.isWinner ? 0 : 1,
            wins: player.isWinner ? 1 : 0,
            placements: player.placement > 0 ? { [player.placement]: 1 } : {},
          };
          return acc;
        },
        {} as Record<number, PlayerRoleStats>,
      ),
      roleCombos: {},
    };
  } else {
    accPlayer.recentForm.push(player.isWinner ? "win" : "loss");
    const current = accPlayer.streaks.current;
    player.roles.forEach((role) => {
      const accRole = accPlayer.roles[role.id];
      if (!accRole) {
        accPlayer.roles[role.id] = {
          roleId: role.id,
          name: role.name,
          description: role.description,
          matchIds: new Set([match.id]),
          winRate: player.isWinner ? 1 : 0,
          wins: player.isWinner ? 1 : 0,
          losses: player.isWinner ? 0 : 1,
          placements: player.placement > 0 ? { [player.placement]: 1 } : {},
        };
      } else {
        accRole.matchIds.add(match.id);
        accRole.wins += player.isWinner ? 1 : 0;
        accRole.losses += player.isWinner ? 0 : 1;
        accRole.winRate = accRole.wins / (accRole.wins + accRole.losses);
        if (player.placement > 0) {
          accRole.placements[player.placement] =
            (accRole.placements[player.placement] ?? 0) + 1;
        }
      }
    });
    if (
      (player.isWinner && current.type === "win") ||
      (!player.isWinner && current.type === "loss")
    ) {
      current.count = current.count + 1;
    } else {
      current.type = player.isWinner ? "win" : "loss";
      current.count = 1;
    }

    const longest = accPlayer.streaks.longest;
    if (current.count > longest.wins && current.type === "win") {
      longest.wins = current.count;
    }
    if (current.count > longest.losses && current.type === "loss") {
      longest.losses = current.count;
    }
    if (isCoop) {
      if (player.isWinner) accPlayer.coopWins++;
      accPlayer.coopMatches++;
      accPlayer.coopScores.push({
        date: match.date,
        score: player.score,
        isWin: player.isWinner ?? false,
      });
    } else {
      if (player.isWinner) accPlayer.competitiveWins++;
      accPlayer.competitiveMatches++;
      accPlayer.placements[player.placement] =
        (accPlayer.placements[player.placement] ?? 0) + 1;
      accPlayer.competitiveScores.push({
        date: match.date,
        score: player.score,
        isWin: player.isWinner ?? false,
      });
      const playerCount = accPlayer.playerCount[match.players.length];
      if (playerCount) {
        playerCount.plays = playerCount.plays + 1;
        playerCount.wins = playerCount.wins + (player.isWinner ? 1 : 0);
        playerCount.placements[player.placement] =
          (playerCount.placements[player.placement] ?? 0) + 1;
      } else {
        accPlayer.playerCount[match.players.length] = {
          playerCount: match.players.length,
          placements: {
            [player.placement]: 1,
          },
          wins: player.isWinner ? 1 : 0,
          plays: 1,
        };
      }
    }
    if (currentScoresheet.parentId) {
      const accScoresheet = accPlayer.scoresheets[currentScoresheet.parentId];
      if (!accScoresheet) {
        const tempPlayerRounds = updateRoundStatistics(
          player.playerRounds,
          currentScoresheet.rounds,
          currentScoresheet.winCondition,
          match.date,
          player.isWinner ?? false,
        );
        accPlayer.scoresheets[currentScoresheet.parentId] = {
          id: currentScoresheet.parentId,
          bestScore: player.score,
          worstScore: player.score,
          scores: [
            {
              date: match.date,
              score: player.score,
              isWin: player.isWinner ?? false,
            },
          ],
          winRate: player.isWinner ? 1 : 0,
          plays: 1,
          wins: player.isWinner ? 1 : 0,
          placements: accPlayer.placements,
          rounds: tempPlayerRounds,
        };
      } else {
        accScoresheet.plays++;
        accScoresheet.wins += player.isWinner ? 1 : 0;
        if (player.score !== null) {
          if (currentScoresheet.winCondition === "Lowest Score") {
            accScoresheet.bestScore = accScoresheet.bestScore
              ? Math.min(accScoresheet.bestScore, player.score)
              : player.score;
            accScoresheet.worstScore = accScoresheet.worstScore
              ? Math.max(accScoresheet.worstScore, player.score)
              : player.score;
          } else if (currentScoresheet.winCondition === "Highest Score") {
            accScoresheet.bestScore = accScoresheet.bestScore
              ? Math.max(accScoresheet.bestScore, player.score)
              : player.score;
            accScoresheet.worstScore = accScoresheet.worstScore
              ? Math.min(accScoresheet.worstScore, player.score)
              : player.score;
          }
        }
        accScoresheet.scores.push({
          date: match.date,
          score: player.score,
          isWin: player.isWinner ?? false,
        });
        player.playerRounds.forEach((pRound) => {
          const foundRound = currentScoresheet.rounds.find(
            (round) => round.id === pRound.roundId,
          );
          if (foundRound?.parentId) {
            const accPlayerRound = accScoresheet.rounds[foundRound.parentId];
            if (!accPlayerRound) {
              accScoresheet.rounds[foundRound.parentId] = {
                id: foundRound.id,
                bestScore:
                  currentScoresheet.winCondition === "Lowest Score" ||
                  currentScoresheet.winCondition === "Highest Score"
                    ? pRound.score
                    : null,
                worstScore:
                  currentScoresheet.winCondition === "Lowest Score" ||
                  currentScoresheet.winCondition === "Highest Score"
                    ? pRound.score
                    : null,
                scores: [
                  {
                    date: match.date,
                    score: pRound.score,
                    isWin: player.isWinner ?? false,
                  },
                ],
              };
            } else {
              if (pRound.score !== null) {
                if (currentScoresheet.winCondition === "Lowest Score") {
                  accPlayerRound.bestScore =
                    accPlayerRound.bestScore !== null
                      ? Math.min(accPlayerRound.bestScore, pRound.score)
                      : pRound.score;
                  accPlayerRound.worstScore =
                    accPlayerRound.worstScore !== null
                      ? Math.max(accPlayerRound.worstScore, pRound.score)
                      : pRound.score;
                } else if (currentScoresheet.winCondition === "Highest Score") {
                  accPlayerRound.bestScore =
                    accPlayerRound.bestScore !== null
                      ? Math.max(accPlayerRound.bestScore, pRound.score)
                      : pRound.score;
                  accPlayerRound.worstScore =
                    accPlayerRound.worstScore !== null
                      ? Math.min(accPlayerRound.worstScore, pRound.score)
                      : pRound.score;
                }
              }
              accPlayerRound.scores.push({
                date: match.date,
                score: pRound.score,
                isWin: player.isWinner ?? false,
              });
            }
          }
        });
        if (!isCoop && player.placement > 0)
          accScoresheet.placements[player.placement] =
            (accScoresheet.placements[player.placement] ?? 0) + 1;
      }
    }
  }
}
function updateComboRoles(
  comboRoles: Record<string, ComboRoleStats>,
  accPlayer: PlayerStats | undefined,
  player: Player,
  match: PlayerMatch,
) {
  if (!accPlayer) {
    console.error(
      `Player ${player.type}-${player.id} not found in accumulator`,
    );
  }
  const roleCombos = combinations(player.roles, 2);
  for (const roleCombo of roleCombos) {
    const sortedCombo = roleCombo
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    const roleComboKey = sortedCombo.map((r) => r.name).join(" + ");
    const globalCombo = comboRoles[roleComboKey];
    if (!globalCombo) {
      comboRoles[roleComboKey] = {
        roles: sortedCombo.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
        })),
        matchCount: 1,
        matchIds: new Set([match.id]),
        players: new Set([`${player.type}-${player.id}`]),
        wins: player.isWinner ? 1 : 0,
        losses: player.isWinner ? 0 : 1,
        winRate: player.isWinner ? 1 : 0,
        placements: player.placement > 0 ? { [player.placement]: 1 } : {},
      };
    } else {
      globalCombo.matchIds.add(match.id);
      globalCombo.wins += player.isWinner ? 1 : 0;
      globalCombo.losses += player.isWinner ? 0 : 1;
      globalCombo.players.add(`${player.type}-${player.id}`);
      globalCombo.winRate =
        globalCombo.wins / (globalCombo.wins + globalCombo.losses);
      if (player.placement > 0) {
        globalCombo.placements[player.placement] =
          (globalCombo.placements[player.placement] ?? 0) + 1;
      }
    }
    const playerCombo = accPlayer?.roleCombos[roleComboKey];
    if (accPlayer && playerCombo) {
      playerCombo.matchIds.add(match.id);
      playerCombo.losses += player.isWinner ? 0 : 1;
      playerCombo.wins += player.isWinner ? 1 : 0;
      playerCombo.winRate =
        playerCombo.wins / (playerCombo.wins + playerCombo.losses);
      if (player.placement > 0) {
        playerCombo.placements[player.placement] =
          (playerCombo.placements[player.placement] ?? 0) + 1;
      }
    } else if (accPlayer) {
      accPlayer.roleCombos[roleComboKey] = {
        roles: sortedCombo.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
        })),
        matchIds: new Set([match.id]),
        wins: player.isWinner ? 1 : 0,
        losses: player.isWinner ? 0 : 1,
        winRate: player.isWinner ? 1 : 0,
        placements: player.placement > 0 ? { [player.placement]: 1 } : {},
      };
    }
  }
}
export function headToHeadStats(playerMatches: PlayerMatch[]) {
  const headToHead = playerMatches.reduce(
    (acc, match) => {
      if (!match.finished) {
        return acc;
      }
      const currentPlayerData = match.players.find((p) => p.isUser);
      if (!currentPlayerData) {
        return acc;
      }

      match.players
        .filter((opponent) => !opponent.isUser)
        .forEach((opponent) => {
          const key = `${opponent.type}-${opponent.id}`;
          acc[key] ??= {
            player: opponent,
            wins: 0,
            losses: 0,
            ties: 0,
            playtime: 0,
            matches: 0,
            coopWins: 0,
            coopLosses: 0,
            coopPlays: 0,
            competitiveWins: 0,
            competitiveLosses: 0,
            competitiveTies: 0,
            competitivePlays: 0,
            teamLosses: 0,
            teamWins: 0,
          };
          const cpWin = currentPlayerData.isWinner;
          const opWin = opponent.isWinner;

          acc[key].matches++;
          if (
            (currentPlayerData.placement > 0 &&
              opponent.placement > 0 &&
              currentPlayerData.placement === opponent.placement) ||
            (cpWin && opWin)
          ) {
            acc[key].ties++;
          } else if (
            cpWin ||
            (currentPlayerData.placement > 0 &&
              opponent.placement > 0 &&
              currentPlayerData.placement < opponent.placement)
          ) {
            acc[key].wins++;
          } else if (
            opWin ||
            (currentPlayerData.placement > 0 &&
              opponent.placement > 0 &&
              currentPlayerData.placement > opponent.placement)
          ) {
            acc[key].losses++;
          }
          if (match.scoresheet.isCoop) {
            acc[key].coopPlays++;
            if (cpWin && opWin) {
              acc[key].coopWins++;
            } else {
              acc[key].coopLosses++;
            }
          }
          if (!match.scoresheet.isCoop) {
            acc[key].competitivePlays++;
            if (
              (cpWin && !opWin) ||
              (currentPlayerData.placement > 0 &&
                opponent.placement > 0 &&
                currentPlayerData.placement < opponent.placement)
            ) {
              acc[key].competitiveWins++;
            } else if (
              (!cpWin && opWin) ||
              (currentPlayerData.placement > 0 &&
                opponent.placement > 0 &&
                currentPlayerData.placement > opponent.placement)
            ) {
              acc[key].competitiveLosses++;
            } else {
              acc[key].competitiveTies++;
            }
          }
          if (
            currentPlayerData.team?.id === opponent.team?.id &&
            !match.scoresheet.isCoop &&
            currentPlayerData.team?.id
          ) {
            if (currentPlayerData.isWinner) {
              acc[key].teamWins++;
            } else {
              acc[key].teamLosses++;
            }
          }
        });

      return acc;
    },
    {} as Record<
      string,
      {
        player: {
          id: number;
          type: "original" | "shared";
          name: string;
          isUser: boolean;
          isWinner: boolean | null;
          score: number | null;
          image: {
            name: string;
            url: string | null;
            type: "file" | "svg";
            usageType: "player" | "match" | "game";
          } | null;
          team: {
            id: number;
            name: string;
            matchId: number;
            details: string | null;
            createdAt: Date;
            updatedAt: Date | null;
          } | null;
          placement: number | null;
        };
        wins: number;
        losses: number;
        ties: number;
        teamWins: number;
        teamLosses: number;
        playtime: number;
        coopWins: number;
        coopLosses: number;
        coopPlays: number;
        competitiveWins: number;
        competitiveLosses: number;
        competitiveTies: number;
        competitivePlays: number;
        matches: number;
      }
    >,
  );

  const headToHeadArray = Object.values(headToHead).map((opponent) => {
    const totalGames = opponent.wins + opponent.losses;
    return {
      ...opponent,
      totalGames: totalGames + opponent.ties,
      winRate: totalGames > 0 ? opponent.wins / totalGames : 0,
    };
  });
  headToHeadArray.sort((a, b) => {
    if (a.totalGames > 10 && b.totalGames > 10) {
      return b.winRate - a.winRate;
    }
    return b.totalGames - a.totalGames;
  });
  return headToHeadArray;
}
