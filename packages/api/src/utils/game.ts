import { compareAsc } from "date-fns";

export function mapMatches(
  matchPlayers: {
    id: number;
    score: number | null;
    order: number | null;
    playerId: number;
    matchId: number;
    teamId: number | null;
    winner: boolean | null;
    placement: number | null;
    match: {
      id: number;
      gameId: number;
      name: string;
      date: Date;
      duration: number;
      finished: boolean;
      comment: string | null;
      teams: {
        id: number;
        name: string;
      }[];
      game: {
        id: number;
        name: string;
        playersMin: number | null;
        playersMax: number | null;
        playtimeMin: number | null;
        playtimeMax: number | null;
        yearPublished: number | null;
        image: {
          name: string;
          url: string | null;
          type: "file" | "svg";
          usageType: "game" | "player" | "match";
        } | null;
      };
      location: {
        id: number;
        name: string;
      } | null;
      matchPlayers: {
        playerId: number;
        score: number | null;
        winner: boolean | null;
        placement: number | null;
        id: number;
        order: number | null;
        matchId: number;
        teamId: number | null;
        player: {
          name: string;
          id: number;
        };
      }[];
    };
  }[],
  sharedLinkedPlayers: {
    id: number;
    permission: "view" | "edit";
    sharedMatchPlayers: {
      id: number;
      matchPlayerId: number;
      permission: "view" | "edit";
      sharedMatchId: number;
      sharedPlayerId: number | null;
      matchPlayer: {
        id: number;
        score: number | null;
        order: number | null;
        playerId: number;
        matchId: number;
        teamId: number | null;
        winner: boolean | null;
        placement: number | null;
      };
      sharedMatch: {
        id: number;
        permission: "view" | "edit";
        sharedGameId: number;
        sharedLocationId: number | null;
        match: {
          date: Date;
          duration: number;
          id: number;
          name: string;
          finished: boolean;
          comment: string | null;
          teams: {
            id: number;
            name: string;
            matchId: number;
          }[];
        };
        sharedGame: {
          id: number;
          ownerId: number;
          sharedWithId: number;
          gameId: number;
          linkedGameId: number | null;
          permission: "view" | "edit";
          createdAt: Date;
          updatedAt: Date | null;
          game: {
            id: number;
            name: string;
            playersMin: number | null;
            playersMax: number | null;
            playtimeMin: number | null;
            playtimeMax: number | null;
            yearPublished: number | null;
            image: {
              name: string;
              url: string | null;
              type: "file" | "svg";
              usageType: "game" | "player" | "match";
            } | null;
          };
          linkedGame: {
            id: number;
            name: string;
            playersMin: number | null;
            playersMax: number | null;
            playtimeMin: number | null;
            playtimeMax: number | null;
            yearPublished: number | null;
            image: {
              name: string;
              url: string | null;
              type: "file" | "svg";
              usageType: "game" | "player" | "match";
            } | null;
          } | null;
        };
        sharedLocation: {
          id: number;
          permission: "view" | "edit";
          location: {
            id: number;
            name: string;
          };
          linkedLocation: {
            id: number;
            name: string;
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
          sharedPlayer: {
            id: number;
            ownerId: number;
            sharedWithId: number;
            playerId: number;
            linkedPlayerId: number | null;
            permission: "view" | "edit";
            player: {
              id: number;
              name: string;
            };
            linkedPlayer:
              | {
                  id: number;
                  name: string;
                }
              | null
              | undefined;
          } | null;
          matchPlayer: {
            id: number;
            matchId: number;
            playerId: number;
            teamId: number | null;
            winner: boolean | null;
            score: number | null;
            placement: number | null;
          };
        }[];
      };
    }[];
  }[],
) {
  const allMatches: {
    type: "Original" | "Shared";
    id: number;
    name: string;
    date: Date;
    duration: number;
    finished: boolean;
    gameId: number;
    gameName: string;
    image: {
      name: string;
      url: string | null;
      type: "file" | "svg";
      usageType: "game";
    } | null;
    locationName?: string;
    players: {
      playerId: number;
      name: string;
      score: number | null;
      isWinner: boolean;
      placement: number | null;
    }[];
    outcome: {
      score: number | null;
      isWinner: boolean;
      placement: number | null;
    };
  }[] = [];

  //— Original matches —
  const seen = new Set<string>();
  matchPlayers.forEach((mp) => {
    const m = mp.match;
    const others = m.matchPlayers.map((p) => ({
      playerId: p.playerId,
      name: p.player.name,
      score: p.score,
      isWinner: p.winner ?? false,
      placement: p.placement,
    }));
    const key = `${m.id}-Original`;
    if (!seen.has(key)) {
      seen.add(key);
      allMatches.push({
        type: "Original",
        id: m.id,
        name: m.name,
        date: m.date,
        duration: m.duration,
        finished: m.finished,
        gameId: m.gameId,
        gameName: m.game.name,
        image: m.game.image
          ? {
              name: m.game.image.name,
              url: m.game.image.url,
              type: m.game.image.type,
              usageType: "game" as const,
            }
          : null,
        locationName: m.location?.name ?? undefined,
        players: others,
        outcome: {
          score: mp.score,
          isWinner: mp.winner ?? false,
          placement: mp.placement,
        },
      });
    }
  });

  sharedLinkedPlayers.forEach((lp) => {
    lp.sharedMatchPlayers.forEach((smp) => {
      if (!seen.has(`${smp.sharedMatch.match.id}-Shared`)) {
        seen.add(`${smp.sharedMatch.match.id}-Shared`);
        const sm = smp.sharedMatch;
        const gameEntity = sm.sharedGame.linkedGame ?? sm.sharedGame.game;
        const players = mapSharedMatchPlayers(sm.sharedMatchPlayers);
        const locationName = sm.sharedLocation?.linkedLocation
          ? sm.sharedLocation.linkedLocation.name
          : sm.sharedLocation?.location.name;
        allMatches.push({
          type: "Shared",
          id: sm.match.id,
          name: sm.match.name,
          date: sm.match.date,
          duration: sm.match.duration,
          finished: sm.match.finished,
          gameId: gameEntity.id,
          gameName: gameEntity.name,
          image: gameEntity.image
            ? {
                name: gameEntity.image.name,
                url: gameEntity.image.url,
                type: gameEntity.image.type,
                usageType: "game" as const,
              }
            : null,
          locationName: locationName ?? undefined,
          players,
          outcome: {
            score: smp.matchPlayer.score,
            isWinner: smp.matchPlayer.winner ?? false,
            placement: smp.matchPlayer.placement,
          },
        });
      }
    });
  });
  allMatches.sort((a, b) => compareAsc(b.date, a.date));
  return allMatches;
}
export function mapSharedMatchPlayers(
  sharedMatchPlayers: {
    id: number;
    ownerId: number;
    sharedWithId: number;
    matchPlayerId: number;
    sharedMatchId: number;
    sharedPlayerId: number | null;
    permission: "view" | "edit";
    sharedPlayer: {
      id: number;
      ownerId: number;
      sharedWithId: number;
      playerId: number;
      linkedPlayerId: number | null;
      permission: "view" | "edit";
      player: {
        id: number;
        name: string;
      };
      linkedPlayer:
        | {
            id: number;
            name: string;
          }
        | null
        | undefined;
    } | null;
    matchPlayer: {
      id: number;
      matchId: number;
      playerId: number;
      teamId: number | null;
      winner: boolean | null;
      score: number | null;
      placement: number | null;
    };
  }[],
) {
  const mapped = sharedMatchPlayers
    .map((p) => {
      const linkedPlayer = p.sharedPlayer?.linkedPlayer;
      if (linkedPlayer) {
        return {
          playerId: linkedPlayer.id,
          name: linkedPlayer.name,
          score: p.matchPlayer.score,
          isWinner: p.matchPlayer.winner ?? false,
          placement: p.matchPlayer.placement,
        };
      } else if (p.sharedPlayer) {
        return {
          playerId: p.sharedPlayer.playerId,
          name: p.sharedPlayer.player.name,
          score: p.matchPlayer.score,
          isWinner: p.matchPlayer.winner ?? false,
          placement: p.matchPlayer.placement,
        };
      }
      return null;
    })
    .filter((p) => p !== null);
  return Array.from(new Map(mapped.map((p) => [p.playerId, p])).values());
}
