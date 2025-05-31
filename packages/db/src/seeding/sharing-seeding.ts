import type { z } from "zod";
import { faker } from "@faker-js/faker";

import type {
  insertSharedMatchPlayerSchema,
  selectSharedLocationSchema,
} from "@board-games/db/zodSchema";
import { db } from "@board-games/db/client";
import {
  sharedGame,
  sharedLocation,
  sharedMatch,
  sharedMatchPlayer,
  sharedPlayer,
  sharedScoresheet,
  shareRequest,
} from "@board-games/db/schema";
import { insertShareRequestSchema } from "@board-games/db/zodSchema";

import { resetTable } from "./seed";

export async function seedSharing(d3Seed: number) {
  faker.seed(d3Seed);
  await resetTable(sharedGame);
  await resetTable(sharedLocation);
  await resetTable(sharedMatchPlayer);
  await resetTable(sharedMatch);
  await resetTable(sharedPlayer);
  await resetTable(sharedScoresheet);
  await resetTable(shareRequest);
  const users = await db.query.user.findMany({
    with: {
      createdPlayers: true,
      games: {
        with: {
          matches: {
            with: {
              matchPlayers: true,
            },
          },
        },
      },
      locations: true,
      friends: {
        with: {
          friendSetting: true,
        },
      },
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const parentShareRequestSchema = insertShareRequestSchema
    .required({ createdAt: true, ownerId: true, permission: true })
    .omit({ updatedAt: true, id: true, token: true, parentShareId: true });
  for (const userA of users) {
    if (userA.friends.length === 0) continue;

    for (const userB of userA.friends) {
      const userShareRequests: z.infer<typeof parentShareRequestSchema>[] =
        Array.from({ length: faker.number.int({ min: 8, max: 30 }) }, () => {
          const itemType = faker.helpers.arrayElement([
            "match",
            "game",
            "player",
          ]);
          const getStatus = () => {
            if (userB.friendSetting) {
              if (itemType === "game") {
                if (userB.friendSetting.autoAcceptGame) {
                  return "accepted";
                }
                if (userB.friendSetting.allowSharedGames) {
                  return "pending";
                }
                return "rejected";
              }
              if (itemType === "player") {
                if (userB.friendSetting.autoAcceptPlayers) {
                  return "accepted";
                }
                if (userB.friendSetting.allowSharedPlayers) {
                  return "pending";
                }
                return "rejected";
              }
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              if (itemType === "match") {
                if (userB.friendSetting.autoAcceptMatches) {
                  return "accepted";
                }
                if (userB.friendSetting.allowSharedMatches) {
                  return "pending";
                }
                return "rejected";
              }
            }

            return faker.helpers.weightedArrayElement([
              { weight: 0.5, value: "accepted" },
              { weight: 0.4, value: "pending" },
              { weight: 0.1, value: "rejected" },
            ]);
          };
          const pastDate = faker.date.past();
          if (itemType === "game" && userA.games.length > 0) {
            return {
              ownerId: userA.id,
              sharedWithId: userB.friendId,
              itemType,
              itemId: faker.helpers.arrayElement(userA.games).id,
              createdAt: pastDate,
              expiresAt: faker.helpers.maybe(
                () => faker.date.future({ years: 1, refDate: pastDate }),
                {
                  probability: 0.5,
                },
              ),
              status: getStatus(),
              permission: faker.helpers.arrayElement(["view", "edit"]),
            };
          }
          if (itemType === "player" && userA.createdPlayers.length > 0) {
            return {
              ownerId: userA.id,
              sharedWithId: userB.friendId,
              itemType,
              itemId: faker.helpers.arrayElement(userA.createdPlayers).id,
              createdAt: pastDate,
              expiresAt: faker.helpers.maybe(
                () => faker.date.future({ years: 1, refDate: pastDate }),
                {
                  probability: 0.5,
                },
              ),
              status: getStatus(),
              permission: faker.helpers.arrayElement(["view", "edit"]),
            };
          }
          if (itemType === "match") {
            const userAMatches = userA.games.flatMap((g) => g.matches);
            if (userAMatches.length === 0) return null;
            return {
              ownerId: userA.id,
              sharedWithId: userB.friendId,
              itemType,
              itemId: faker.helpers.arrayElement(userAMatches).id,
              expiresAt: faker.helpers.maybe(
                () => faker.date.future({ years: 1, refDate: pastDate }),
                {
                  probability: 0.5,
                },
              ),
              createdAt: pastDate,
              status: getStatus(),
              permission: faker.helpers.arrayElement(["view", "edit"]),
            };
          }
          return null;
        }).filter((item) => item !== null);
      const returnedUserShareRequests = await db
        .insert(shareRequest)
        .values(userShareRequests)
        .returning();
      for (const returnedUserShareRequest of returnedUserShareRequests) {
        const currentShareRequests = await db.query.shareRequest.findMany({
          where: {
            ownerId: returnedUserShareRequest.ownerId,
            status: "accepted",
            sharedWith: true,
          },
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const childShareRequestSchema = insertShareRequestSchema
          .required({ parentShareId: true, createdAt: true })
          .omit({ updatedAt: true, id: true, token: true });
        if (returnedUserShareRequest.itemType === "game") {
          const returnedGame = await db.query.game.findFirst({
            where: {
              id: returnedUserShareRequest.itemId,
              userId: returnedUserShareRequest.ownerId,
            },
            with: {
              scoresheets: true,
              matches: {
                with: {
                  matchPlayers: true,
                },
              },
            },
          });
          if (returnedGame) {
            const childShareRequest: z.infer<typeof childShareRequestSchema>[] =
              [];
            if (returnedGame.matches.length > 0 && faker.datatype.boolean()) {
              faker.helpers
                .arrayElements(returnedGame.matches, {
                  min: 1,
                  max: returnedGame.matches.length,
                })
                .forEach((m) => {
                  if (m.locationId !== null) {
                    childShareRequest.push({
                      createdAt: returnedUserShareRequest.createdAt,
                      itemId: m.locationId,
                      parentShareId: returnedUserShareRequest.id,
                      status: returnedUserShareRequest.status,
                      itemType: "location",
                      ownerId: returnedUserShareRequest.ownerId,
                      expiresAt: returnedUserShareRequest.expiresAt,
                      permission: faker.helpers.arrayElement(["view", "edit"]),
                      sharedWithId: returnedUserShareRequest.sharedWithId,
                    });
                  }
                  childShareRequest.push({
                    createdAt: returnedUserShareRequest.createdAt,
                    itemId: m.id,
                    parentShareId: returnedUserShareRequest.id,
                    status: returnedUserShareRequest.status,
                    itemType: "match",
                    ownerId: returnedUserShareRequest.ownerId,
                    expiresAt: returnedUserShareRequest.expiresAt,
                    permission: faker.helpers.arrayElement(["view", "edit"]),
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                  });
                  if (faker.datatype.boolean(0.8)) {
                    m.matchPlayers.forEach((mPlayer) => {
                      childShareRequest.push({
                        createdAt: returnedUserShareRequest.createdAt,
                        itemId: mPlayer.playerId,
                        parentShareId: returnedUserShareRequest.id,
                        status: returnedUserShareRequest.status,
                        itemType: "player",
                        ownerId: returnedUserShareRequest.ownerId,
                        expiresAt: returnedUserShareRequest.expiresAt,
                        permission: "view",
                        sharedWithId: returnedUserShareRequest.sharedWithId,
                      });
                    });
                  }
                });
              returnedGame.scoresheets.forEach((sSheet) => {
                if (sSheet.type === "Default") {
                  childShareRequest.push({
                    createdAt: returnedUserShareRequest.createdAt,
                    itemId: sSheet.id,
                    parentShareId: returnedUserShareRequest.id,
                    status: returnedUserShareRequest.status,
                    itemType: "scoresheet",
                    ownerId: returnedUserShareRequest.ownerId,
                    expiresAt: returnedUserShareRequest.expiresAt,
                    permission: faker.helpers.arrayElement(["view", "edit"]),
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                  });
                } else if (faker.datatype.boolean(0.5)) {
                  childShareRequest.push({
                    createdAt: returnedUserShareRequest.createdAt,
                    itemId: sSheet.id,
                    parentShareId: returnedUserShareRequest.id,
                    status: returnedUserShareRequest.status,
                    itemType: "scoresheet",
                    ownerId: returnedUserShareRequest.ownerId,
                    expiresAt: returnedUserShareRequest.expiresAt,
                    permission: faker.helpers.arrayElement(["view", "edit"]),
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                  });
                }
              });
            }
            const uniqueMap = new Map<
              string,
              z.infer<typeof childShareRequestSchema>
            >();
            for (const req of childShareRequest) {
              const key = `${req.itemType}-${req.itemId}`;
              if (!uniqueMap.has(key)) {
                uniqueMap.set(key, req);
              }
            }

            // Filter out items that are already in currentShareRequest
            const filteredChildShareRequest = Array.from(
              uniqueMap.values(),
            ).filter(
              (cShareRequest) =>
                !currentShareRequests.find(
                  (existing) =>
                    existing.itemType === cShareRequest.itemType &&
                    existing.itemId === cShareRequest.itemId &&
                    existing.sharedWithId === cShareRequest.sharedWithId,
                ),
            );

            if (filteredChildShareRequest.length > 0) {
              await db.insert(shareRequest).values(filteredChildShareRequest);
            }
            if (
              returnedUserShareRequest.status === "accepted" &&
              returnedUserShareRequest.sharedWithId !== null
            ) {
              const sharedWithGames = await db.query.game.findMany({
                where: {
                  userId: returnedUserShareRequest.sharedWithId,
                },
              });
              const [returnedSharedGame] = await db
                .insert(sharedGame)
                .values({
                  ownerId: returnedUserShareRequest.ownerId,
                  sharedWithId: returnedUserShareRequest.sharedWithId,
                  gameId: returnedGame.id,
                  permission: returnedUserShareRequest.permission,
                  linkedGameId:
                    sharedWithGames.length > 0
                      ? faker.helpers.maybe(
                          () => faker.helpers.arrayElement(sharedWithGames).id,
                          { probability: 0.2 },
                        )
                      : undefined,
                })
                .returning();
              if (!returnedSharedGame) {
                throw new Error("Failed to create shared game");
              }
              const sharedUserPlayers = await db.query.player.findMany({
                where: {
                  createdBy: returnedUserShareRequest.sharedWithId,
                },
              });
              const sharedUserPlayerIds = sharedUserPlayers.map(
                (player) => player.id,
              );
              const sharedUserLocations = await db.query.location.findMany({
                where: {
                  createdBy: returnedUserShareRequest.sharedWithId,
                },
              });
              const sharedUserLocationIds = sharedUserLocations.map(
                (location) => location.id,
              );
              const childShareRequest = await db.query.shareRequest.findMany({
                where: {
                  parentShareId: returnedUserShareRequest.id,
                  status: "accepted",
                },
                orderBy: { createdAt: "asc" },
              });
              for (const cShareRequest of childShareRequest.filter(
                (cShareRequest) => cShareRequest.itemType === "player",
              )) {
                if (cShareRequest.itemType === "player") {
                  const existingSharedPlayer =
                    await db.query.sharedPlayer.findFirst({
                      where: {
                        ownerId: returnedUserShareRequest.ownerId,
                        sharedWithId: returnedUserShareRequest.sharedWithId,
                        playerId: cShareRequest.itemId,
                      },
                    });
                  if (!existingSharedPlayer) {
                    await db.insert(sharedPlayer).values({
                      ownerId: returnedUserShareRequest.ownerId,
                      sharedWithId: returnedUserShareRequest.sharedWithId,
                      playerId: cShareRequest.itemId,
                      permission: cShareRequest.permission,
                      linkedPlayerId:
                        sharedUserPlayerIds.length > 0
                          ? faker.helpers.maybe(
                              () =>
                                faker.helpers.arrayElement(sharedUserPlayerIds),
                              { probability: 0.2 },
                            )
                          : undefined,
                    });
                  }
                }
              }
              for (const cShareRequest of childShareRequest.filter(
                (c) => c.itemType === "location",
              )) {
                if (cShareRequest.itemType === "location") {
                  const existingLocation = await db.query.location.findFirst({
                    where: {
                      createdBy: returnedUserShareRequest.ownerId,
                      id: cShareRequest.itemId,
                    },
                  });
                  if (!existingLocation) {
                    throw new Error("Location not found.");
                  }
                  const existingSharedLocation =
                    await db.query.sharedLocation.findFirst({
                      where: {
                        ownerId: returnedUserShareRequest.ownerId,
                        sharedWithId: returnedUserShareRequest.sharedWithId,
                        locationId: cShareRequest.itemId,
                      },
                    });
                  if (!existingSharedLocation) {
                    const [insertedSharedLocation] = await db
                      .insert(sharedLocation)
                      .values({
                        ownerId: returnedUserShareRequest.ownerId,
                        sharedWithId: returnedUserShareRequest.sharedWithId,
                        locationId: cShareRequest.itemId,
                        permission: cShareRequest.permission,
                        linkedLocationId:
                          sharedUserLocationIds.length > 0
                            ? faker.helpers.maybe(
                                () =>
                                  faker.helpers.arrayElement(
                                    sharedUserLocationIds,
                                  ),
                                { probability: 0.5 },
                              )
                            : null,
                      })
                      .returning();
                    if (!insertedSharedLocation) {
                      throw Error("Shared Location not found");
                    }
                  }
                }
              }
              for (const cShareRequest of childShareRequest.filter(
                (cShareRequest) => cShareRequest.itemType === "match",
              )) {
                if (cShareRequest.itemType === "match") {
                  const existingMatch = await db.query.match.findFirst({
                    where: {
                      userId: returnedUserShareRequest.ownerId,
                      id: cShareRequest.itemId,
                    },
                  });
                  if (!existingMatch) {
                    throw Error("Match not found");
                  }
                  const existingSharedMatch =
                    await db.query.sharedMatch.findFirst({
                      where: {
                        ownerId: returnedUserShareRequest.ownerId,
                        sharedWithId: returnedUserShareRequest.sharedWithId,
                        matchId: cShareRequest.itemId,
                      },
                    });
                  if (!existingSharedMatch) {
                    let sharedLocationForMatch: z.infer<
                      typeof selectSharedLocationSchema
                    > | null = null;
                    if (existingMatch.locationId !== null) {
                      const existingSharedLocation =
                        await db.query.sharedLocation.findFirst({
                          where: {
                            ownerId: returnedUserShareRequest.ownerId,
                            sharedWithId: returnedUserShareRequest.sharedWithId,
                            locationId: existingMatch.locationId,
                          },
                        });
                      if (existingSharedLocation) {
                        sharedLocationForMatch = existingSharedLocation;
                      }
                    }
                    const [returnedSharedMatch] = await db
                      .insert(sharedMatch)
                      .values({
                        ownerId: returnedUserShareRequest.ownerId,
                        sharedWithId: returnedUserShareRequest.sharedWithId,
                        matchId: cShareRequest.itemId,
                        sharedGameId: returnedSharedGame.id,
                        sharedLocationId: sharedLocationForMatch?.id ?? null,
                        permission: cShareRequest.permission,
                      })
                      .returning();
                    if (!returnedSharedMatch) {
                      throw new Error("Shared Match not created successfully");
                    }
                    const returnedMatchPlayers =
                      await db.query.matchPlayer.findMany({
                        where: {
                          matchId: cShareRequest.itemId,
                        },
                      });
                    const sharedMatchPlayersToInsert: z.infer<
                      typeof insertSharedMatchPlayerSchema
                    >[] = await Promise.all(
                      returnedMatchPlayers.map(async (returnedMatchPlayer) => {
                        const existingSharedPlayer =
                          await db.query.sharedPlayer.findFirst({
                            where: {
                              ownerId: returnedUserShareRequest.ownerId,
                              sharedWithId:
                                returnedUserShareRequest.sharedWithId ?? 0,
                              playerId: returnedMatchPlayer.playerId,
                            },
                          });
                        if (existingSharedPlayer) {
                          return {
                            matchPlayerId: returnedMatchPlayer.id,
                            sharedPlayerId: existingSharedPlayer.id,
                            ownerId: returnedUserShareRequest.ownerId,
                            sharedWithId:
                              returnedUserShareRequest.sharedWithId ?? 0,
                            sharedMatchId: returnedSharedMatch.id,
                            permission: cShareRequest.permission,
                          };
                        }
                        return {
                          matchPlayerId: returnedMatchPlayer.id,
                          ownerId: returnedUserShareRequest.ownerId,
                          sharedWithId:
                            returnedUserShareRequest.sharedWithId ?? 0,
                          sharedMatchId: returnedSharedMatch.id,
                          permission: cShareRequest.permission,
                        };
                      }),
                    );
                    await db
                      .insert(sharedMatchPlayer)
                      .values(sharedMatchPlayersToInsert);
                  }
                }
              }
              for (const cShareRequest of childShareRequest.filter(
                (cShareRequest) => cShareRequest.itemType === "scoresheet",
              )) {
                if (cShareRequest.itemType === "scoresheet") {
                  await db.insert(sharedScoresheet).values({
                    ownerId: returnedUserShareRequest.ownerId,
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                    scoresheetId: cShareRequest.itemId,
                    permission: cShareRequest.permission,
                    sharedGameId: returnedSharedGame.id,
                  });
                }
              }
            }
          }
        }
        if (returnedUserShareRequest.itemType === "match") {
          const returnedMatch = await db.query.match.findFirst({
            where: {
              id: returnedUserShareRequest.itemId,
              userId: returnedUserShareRequest.ownerId,
            },
            with: {
              game: {
                with: {
                  scoresheets: true,
                },
              },
              matchPlayers: true,
            },
          });
          if (returnedMatch) {
            const childShareRequest: z.infer<typeof childShareRequestSchema>[] =
              [];
            childShareRequest.push({
              createdAt: returnedUserShareRequest.createdAt,
              itemId: returnedMatch.gameId,
              parentShareId: returnedUserShareRequest.id,
              status: returnedUserShareRequest.status,
              itemType: "game",
              ownerId: returnedUserShareRequest.ownerId,
              expiresAt: returnedUserShareRequest.expiresAt,
              permission: faker.helpers.arrayElement(["view", "edit"]),
              sharedWithId: returnedUserShareRequest.sharedWithId,
            });
            if (returnedMatch.locationId) {
              childShareRequest.push({
                createdAt: returnedUserShareRequest.createdAt,
                itemId: returnedMatch.locationId,
                parentShareId: returnedUserShareRequest.id,
                status: returnedUserShareRequest.status,
                itemType: "location",
                ownerId: returnedUserShareRequest.ownerId,
                expiresAt: returnedUserShareRequest.expiresAt,
                permission: faker.helpers.arrayElement(["view", "edit"]),
                sharedWithId: returnedUserShareRequest.sharedWithId,
              });
            }
            for (const childScoresheet of returnedMatch.game.scoresheets) {
              childShareRequest.push({
                createdAt: returnedUserShareRequest.createdAt,
                itemId: childScoresheet.id,
                parentShareId: returnedUserShareRequest.id,
                status: returnedUserShareRequest.status,
                itemType: "scoresheet",
                ownerId: returnedUserShareRequest.ownerId,
                expiresAt: returnedUserShareRequest.expiresAt,
                permission: faker.helpers.arrayElement(["view", "edit"]),
                sharedWithId: returnedUserShareRequest.sharedWithId,
              });
            }

            if (faker.datatype.boolean(0.8)) {
              returnedMatch.matchPlayers.forEach((mPlayer) => {
                childShareRequest.push({
                  createdAt: returnedUserShareRequest.createdAt,
                  itemId: mPlayer.playerId,
                  parentShareId: returnedUserShareRequest.id,
                  status: returnedUserShareRequest.status,
                  itemType: "player",
                  ownerId: returnedUserShareRequest.ownerId,
                  expiresAt: returnedUserShareRequest.expiresAt,
                  permission: faker.helpers.arrayElement(["view", "edit"]),
                  sharedWithId: returnedUserShareRequest.sharedWithId,
                });
              });
            }
            const uniqueMap = new Map<
              string,
              z.infer<typeof childShareRequestSchema>
            >();
            for (const req of childShareRequest) {
              const key = `${req.itemType}-${req.itemId}`;
              if (!uniqueMap.has(key)) {
                uniqueMap.set(key, req);
              }
            }

            // Filter out items that are already in currentShareRequest
            const filteredChildShareRequest = Array.from(
              uniqueMap.values(),
            ).filter(
              (cShareRequest) =>
                !currentShareRequests.find(
                  (existing) =>
                    existing.itemType === cShareRequest.itemType &&
                    existing.itemId === cShareRequest.itemId &&
                    existing.sharedWithId === cShareRequest.sharedWithId &&
                    existing.ownerId === cShareRequest.ownerId &&
                    existing.status === cShareRequest.status,
                ),
            );
            if (filteredChildShareRequest.length > 0) {
              await db.insert(shareRequest).values(filteredChildShareRequest);
            }
            if (
              returnedUserShareRequest.status === "accepted" &&
              returnedUserShareRequest.sharedWithId !== null
            ) {
              const sharedUserPlayers = await db.query.player.findMany({
                where: {
                  createdBy: returnedUserShareRequest.sharedWithId,
                },
              });
              const sharedUserPlayerIds = sharedUserPlayers.map(
                (player) => player.id,
              );
              const sharedUserLocations = await db.query.location.findMany({
                where: {
                  createdBy: returnedUserShareRequest.sharedWithId,
                },
              });
              const sharedUserLocationIds = sharedUserLocations.map(
                (location) => location.id,
              );
              const childShareRequest = await db.query.shareRequest.findMany({
                where: {
                  parentShareId: returnedUserShareRequest.id,
                  status: "accepted",
                },
                orderBy: {
                  createdAt: "asc",
                },
              });
              const locationChildShareRequest = childShareRequest.find(
                (cShareRequest) => cShareRequest.itemType === "location",
              );
              if (locationChildShareRequest) {
                const existingSharedLocation =
                  await db.query.sharedLocation.findFirst({
                    where: {
                      ownerId: returnedUserShareRequest.ownerId,
                      sharedWithId: returnedUserShareRequest.sharedWithId,
                      locationId: locationChildShareRequest.itemId,
                    },
                  });
                if (!existingSharedLocation) {
                  const [insertedSharedLocation] = await db
                    .insert(sharedLocation)
                    .values({
                      ownerId: returnedUserShareRequest.ownerId,
                      sharedWithId: returnedUserShareRequest.sharedWithId,
                      locationId: locationChildShareRequest.itemId,
                      permission: locationChildShareRequest.permission,
                      linkedLocationId:
                        sharedUserLocationIds.length > 0
                          ? faker.helpers.maybe(
                              () =>
                                faker.helpers.arrayElement(
                                  sharedUserLocationIds,
                                ),
                              { probability: 0.5 },
                            )
                          : null,
                    })
                    .returning();
                  if (!insertedSharedLocation) {
                    throw Error("Shared Location not found");
                  }
                }
              }
              for (const cShareRequest of childShareRequest) {
                if (cShareRequest.itemType === "game") {
                  const sharedWithGames = await db.query.game.findMany({
                    where: {
                      userId: returnedUserShareRequest.sharedWithId,
                    },
                  });
                  await db.insert(sharedGame).values({
                    ownerId: returnedUserShareRequest.ownerId,
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                    gameId: cShareRequest.itemId,
                    permission: cShareRequest.permission,
                    linkedGameId:
                      sharedWithGames.length > 0
                        ? faker.helpers.maybe(
                            () =>
                              faker.helpers.arrayElement(sharedWithGames).id,
                            { probability: 0.2 },
                          )
                        : undefined,
                  });
                }
                if (cShareRequest.itemType === "player") {
                  await db.insert(sharedPlayer).values({
                    ownerId: returnedUserShareRequest.ownerId,
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                    playerId: cShareRequest.itemId,
                    permission: cShareRequest.permission,
                    linkedPlayerId:
                      sharedUserPlayerIds.length > 0
                        ? faker.helpers.maybe(
                            () =>
                              faker.helpers.arrayElement(sharedUserPlayerIds),
                            { probability: 0.2 },
                          )
                        : undefined,
                  });
                }
              }
              const returnedSharedGame = await db.query.sharedGame.findFirst({
                where: {
                  ownerId: returnedUserShareRequest.ownerId,
                  sharedWithId: returnedUserShareRequest.sharedWithId,
                  gameId: returnedMatch.gameId,
                },
              });
              if (returnedSharedGame) {
                for (const cShareRequest of childShareRequest.filter(
                  (c) => c.itemType === "scoresheet",
                )) {
                  if (cShareRequest.itemType === "scoresheet") {
                    await db.insert(sharedScoresheet).values({
                      ownerId: returnedUserShareRequest.ownerId,
                      sharedWithId: returnedUserShareRequest.sharedWithId,
                      scoresheetId: cShareRequest.itemId,
                      permission: cShareRequest.permission,
                      sharedGameId: returnedSharedGame.id,
                    });
                  }
                }
                const existingMatch = await db.query.match.findFirst({
                  where: {
                    id: returnedMatch.id,
                    userId: returnedUserShareRequest.ownerId,
                  },
                });
                if (!existingMatch) {
                  throw new Error("Match not found");
                }
                const existingSharedMatch =
                  await db.query.sharedMatch.findFirst({
                    where: {
                      ownerId: returnedUserShareRequest.ownerId,
                      sharedWithId: returnedUserShareRequest.sharedWithId,
                      matchId: returnedMatch.id,
                    },
                  });
                if (!existingSharedMatch) {
                  let sharedLocationForMatch: z.infer<
                    typeof selectSharedLocationSchema
                  > | null = null;
                  if (existingMatch.locationId !== null) {
                    const existingSharedLocation =
                      await db.query.sharedLocation.findFirst({
                        where: {
                          ownerId: returnedUserShareRequest.ownerId,
                          sharedWithId: returnedUserShareRequest.sharedWithId,
                          locationId: existingMatch.locationId,
                        },
                      });
                    if (existingSharedLocation) {
                      sharedLocationForMatch = existingSharedLocation;
                    }
                  }
                  const [returnedSharedMatch] = await db
                    .insert(sharedMatch)
                    .values({
                      ownerId: returnedUserShareRequest.ownerId,
                      sharedWithId: returnedUserShareRequest.sharedWithId,
                      matchId: returnedMatch.id,
                      sharedGameId: returnedSharedGame.id,
                      sharedLocationId: sharedLocationForMatch?.id ?? null,
                      permission: returnedUserShareRequest.permission,
                    })
                    .returning();
                  if (!returnedSharedMatch) {
                    throw new Error("Shared Match not created successfully");
                  }
                  const returnedMatchPlayers =
                    await db.query.matchPlayer.findMany({
                      where: {
                        matchId: returnedMatch.id,
                      },
                    });
                  const sharedMatchPlayersToInsert: z.infer<
                    typeof insertSharedMatchPlayerSchema
                  >[] = await Promise.all(
                    returnedMatchPlayers.map(async (returnedMatchPlayer) => {
                      const existingSharedPlayer =
                        await db.query.sharedPlayer.findFirst({
                          where: {
                            ownerId: returnedUserShareRequest.ownerId,
                            sharedWithId:
                              returnedUserShareRequest.sharedWithId ?? 0,
                            playerId: returnedMatchPlayer.playerId,
                          },
                        });
                      if (existingSharedPlayer) {
                        return {
                          matchPlayerId: returnedMatchPlayer.id,
                          sharedPlayerId: existingSharedPlayer.id,
                          ownerId: returnedUserShareRequest.ownerId,
                          sharedWithId:
                            returnedUserShareRequest.sharedWithId ?? 0,
                          sharedMatchId: returnedSharedMatch.id,
                          permission: returnedUserShareRequest.permission,
                        };
                      }
                      return {
                        matchPlayerId: returnedMatchPlayer.id,
                        ownerId: returnedUserShareRequest.ownerId,
                        sharedWithId:
                          returnedUserShareRequest.sharedWithId ?? 0,
                        sharedMatchId: returnedSharedMatch.id,
                        permission: returnedUserShareRequest.permission,
                      };
                    }),
                  );
                  await db
                    .insert(sharedMatchPlayer)
                    .values(sharedMatchPlayersToInsert);
                }
              }
            }
          }
        }
        if (returnedUserShareRequest.itemType === "player") {
          const returnedPlayer = await db.query.player.findFirst({
            where: {
              id: returnedUserShareRequest.itemId,
              createdBy: returnedUserShareRequest.ownerId,
            },
            with: {
              matchPlayers: {
                with: {
                  match: {
                    with: {
                      matchPlayers: {
                        where: {
                          NOT: {
                            playerId: returnedUserShareRequest.itemId,
                          },
                        },
                        with: {
                          match: true,
                        },
                      },
                      game: {
                        with: {
                          scoresheets: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });
          if (returnedPlayer) {
            const childShareRequest: z.infer<typeof childShareRequestSchema>[] =
              [];
            if (
              returnedPlayer.matchPlayers.length > 0 &&
              faker.datatype.boolean()
            ) {
              faker.helpers
                .arrayElements(returnedPlayer.matchPlayers, {
                  min: 1,
                  max: returnedPlayer.matchPlayers.length,
                })
                .forEach((mPlayer) => {
                  childShareRequest.push({
                    createdAt: returnedUserShareRequest.createdAt,
                    itemId: mPlayer.match.id,
                    parentShareId: returnedUserShareRequest.id,
                    status: returnedUserShareRequest.status,
                    itemType: "match",
                    ownerId: returnedUserShareRequest.ownerId,
                    expiresAt: returnedUserShareRequest.expiresAt,
                    permission: faker.helpers.arrayElement(["view", "edit"]),
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                  });
                  if (mPlayer.match.locationId !== null) {
                    childShareRequest.push({
                      createdAt: returnedUserShareRequest.createdAt,
                      itemId: mPlayer.match.locationId,
                      parentShareId: returnedUserShareRequest.id,
                      status: returnedUserShareRequest.status,
                      itemType: "location",
                      ownerId: returnedUserShareRequest.ownerId,
                      expiresAt: returnedUserShareRequest.expiresAt,
                      permission: faker.helpers.arrayElement(["view", "edit"]),
                      sharedWithId: returnedUserShareRequest.sharedWithId,
                    });
                  }
                  childShareRequest.push({
                    createdAt: returnedUserShareRequest.createdAt,
                    itemId: mPlayer.match.gameId,
                    parentShareId: returnedUserShareRequest.id,
                    status: returnedUserShareRequest.status,
                    itemType: "game",
                    ownerId: returnedUserShareRequest.ownerId,
                    expiresAt: returnedUserShareRequest.expiresAt,
                    permission: faker.helpers.arrayElement(["view", "edit"]),
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                  });
                  for (const childScoresheet of mPlayer.match.game
                    .scoresheets) {
                    childShareRequest.push({
                      createdAt: returnedUserShareRequest.createdAt,
                      itemId: childScoresheet.id,
                      parentShareId: returnedUserShareRequest.id,
                      status: returnedUserShareRequest.status,
                      itemType: "scoresheet",
                      ownerId: returnedUserShareRequest.ownerId,
                      expiresAt: returnedUserShareRequest.expiresAt,
                      permission: faker.helpers.arrayElement(["view", "edit"]),
                      sharedWithId: returnedUserShareRequest.sharedWithId,
                    });
                  }
                  if (faker.datatype.boolean(0.8)) {
                    mPlayer.match.matchPlayers.forEach((mPlayer) => {
                      if (
                        mPlayer.playerId !== returnedUserShareRequest.itemId
                      ) {
                        childShareRequest.push({
                          createdAt: returnedUserShareRequest.createdAt,
                          itemId: mPlayer.playerId,
                          parentShareId: returnedUserShareRequest.id,
                          status: returnedUserShareRequest.status,
                          itemType: "player",
                          ownerId: returnedUserShareRequest.ownerId,
                          expiresAt: returnedUserShareRequest.expiresAt,
                          permission: faker.helpers.arrayElement([
                            "view",
                            "edit",
                          ]),
                          sharedWithId: returnedUserShareRequest.sharedWithId,
                        });
                      }
                    });
                  }
                });
            }
            const uniqueMap = new Map<
              string,
              z.infer<typeof childShareRequestSchema>
            >();
            for (const req of childShareRequest) {
              const key = `${req.itemType}-${req.itemId}`;
              if (!uniqueMap.has(key)) {
                uniqueMap.set(key, req);
              }
            }

            // Filter out items that are already in currentShareRequest
            const filteredChildShareRequest = Array.from(
              uniqueMap.values(),
            ).filter(
              (cShareRequest) =>
                !currentShareRequests.find(
                  (existing) =>
                    existing.itemType === cShareRequest.itemType &&
                    existing.itemId === cShareRequest.itemId &&
                    existing.sharedWithId === cShareRequest.sharedWithId,
                ),
            );
            console.log(
              "About to insert childShareRequests",
              uniqueMap.size,
              filteredChildShareRequest.length,
            );

            if (filteredChildShareRequest.length > 0) {
              const inserted = await db
                .insert(shareRequest)
                .values(filteredChildShareRequest)
                .returning();
              if (inserted.length !== filteredChildShareRequest.length) {
                console.warn(
                  "Some share requests may not have been inserted:",
                  inserted,
                );
              }
            }
            if (
              returnedUserShareRequest.status === "accepted" &&
              returnedUserShareRequest.sharedWithId !== null
            ) {
              const childShareRequest = await db.query.shareRequest.findMany({
                where: {
                  parentShareId: returnedUserShareRequest.id,
                  status: "accepted",
                },
                orderBy: {
                  createdAt: "asc",
                },
              });
              const sharedUserPlayers = await db.query.player.findMany({
                where: {
                  createdBy: returnedUserShareRequest.sharedWithId,
                },
              });
              const sharedUserPlayerIds = sharedUserPlayers.map(
                (player) => player.id,
              );
              const sharedUserLocations = await db.query.location.findMany({
                where: {
                  createdBy: returnedUserShareRequest.sharedWithId,
                },
              });
              const sharedUserLocationIds = sharedUserLocations.map(
                (location) => location.id,
              );
              const sharedWithGames = await db.query.game.findMany({
                where: {
                  userId: returnedUserShareRequest.sharedWithId,
                },
              });
              for (const cShareRequest of childShareRequest) {
                if (cShareRequest.itemType === "game") {
                  await db.insert(sharedGame).values({
                    ownerId: returnedUserShareRequest.ownerId,
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                    gameId: cShareRequest.itemId,
                    permission: cShareRequest.permission,
                    linkedGameId:
                      sharedWithGames.length > 0
                        ? faker.helpers.maybe(
                            () =>
                              faker.helpers.arrayElement(sharedWithGames).id,
                            { probability: 0.2 },
                          )
                        : undefined,
                  });
                }
                if (cShareRequest.itemType === "player") {
                  await db.insert(sharedPlayer).values({
                    ownerId: returnedUserShareRequest.ownerId,
                    sharedWithId: returnedUserShareRequest.sharedWithId,
                    playerId: cShareRequest.itemId,
                    permission: cShareRequest.permission,
                    linkedPlayerId:
                      sharedUserPlayerIds.length > 0
                        ? faker.helpers.maybe(
                            () =>
                              faker.helpers.arrayElement(sharedUserPlayerIds),
                            { probability: 0.2 },
                          )
                        : undefined,
                  });
                }
              }

              for (const cShareRequest of childShareRequest.filter(
                (cShareRequest) => cShareRequest.itemType === "location",
              )) {
                const existingLocation = await db.query.location.findFirst({
                  where: {
                    createdBy: returnedUserShareRequest.ownerId,
                    id: cShareRequest.itemId,
                  },
                });
                if (!existingLocation) {
                  throw new Error("Location not found.");
                }
                const existingSharedLocation =
                  await db.query.sharedLocation.findFirst({
                    where: {
                      ownerId: returnedUserShareRequest.ownerId,
                      sharedWithId: returnedUserShareRequest.sharedWithId,
                      locationId: cShareRequest.itemId,
                    },
                  });
                if (!existingSharedLocation) {
                  const [insertedSharedLocation] = await db
                    .insert(sharedLocation)
                    .values({
                      ownerId: returnedUserShareRequest.ownerId,
                      sharedWithId: returnedUserShareRequest.sharedWithId,
                      locationId: cShareRequest.itemId,
                      permission: cShareRequest.permission,
                      linkedLocationId:
                        sharedUserLocationIds.length > 0
                          ? faker.helpers.maybe(
                              () =>
                                faker.helpers.arrayElement(
                                  sharedUserLocationIds,
                                ),
                              { probability: 0.5 },
                            )
                          : null,
                    })
                    .returning();
                  if (!insertedSharedLocation) {
                    throw Error("Shared Location not found");
                  }
                }
              }

              for (const cShareRequest of childShareRequest.filter(
                (c) => c.itemType === "scoresheet" || c.itemType === "match",
              )) {
                if (cShareRequest.itemType === "scoresheet") {
                  const returnedScoresheet =
                    await db.query.scoresheet.findFirst({
                      where: {
                        id: cShareRequest.itemId,
                        userId: returnedUserShareRequest.ownerId,
                      },
                    });
                  if (!returnedScoresheet) {
                    throw new Error("Scoresheet not found.");
                  }
                  const returnedSharedGame =
                    await db.query.sharedGame.findFirst({
                      where: {
                        ownerId: returnedUserShareRequest.ownerId,
                        sharedWithId: returnedUserShareRequest.sharedWithId,
                        gameId: returnedScoresheet.gameId,
                      },
                    });
                  if (returnedSharedGame) {
                    await db.insert(sharedScoresheet).values({
                      ownerId: returnedUserShareRequest.ownerId,
                      sharedWithId: returnedUserShareRequest.sharedWithId,
                      scoresheetId: cShareRequest.itemId,
                      permission: cShareRequest.permission,
                      sharedGameId: returnedSharedGame.id,
                    });
                  }
                }
                if (cShareRequest.itemType === "match") {
                  const returnedMatch = await db.query.match.findFirst({
                    where: {
                      id: cShareRequest.itemId,
                      userId: returnedUserShareRequest.ownerId,
                    },
                  });
                  if (!returnedMatch) {
                    throw new Error("Match not found.");
                  }
                  const returnedSharedGame =
                    await db.query.sharedGame.findFirst({
                      where: {
                        ownerId: returnedUserShareRequest.ownerId,
                        sharedWithId: returnedUserShareRequest.sharedWithId,
                        gameId: returnedMatch.gameId,
                      },
                    });
                  if (returnedSharedGame) {
                    const existingMatch = await db.query.match.findFirst({
                      where: {
                        id: cShareRequest.itemId,
                        userId: returnedUserShareRequest.ownerId,
                      },
                    });
                    if (!existingMatch) {
                      throw new Error("Match not found.");
                    }
                    const existingSharedMatch =
                      await db.query.sharedMatch.findFirst({
                        where: {
                          ownerId: returnedUserShareRequest.ownerId,
                          sharedWithId: returnedUserShareRequest.sharedWithId,
                          matchId: cShareRequest.itemId,
                        },
                      });
                    if (!existingSharedMatch) {
                      let sharedLocationForMatch: z.infer<
                        typeof selectSharedLocationSchema
                      > | null = null;
                      if (existingMatch.locationId !== null) {
                        const existingSharedLocation =
                          await db.query.sharedLocation.findFirst({
                            where: {
                              ownerId: returnedUserShareRequest.ownerId,
                              sharedWithId:
                                returnedUserShareRequest.sharedWithId,
                              locationId: existingMatch.locationId,
                            },
                          });
                        if (existingSharedLocation) {
                          sharedLocationForMatch = existingSharedLocation;
                        }
                      }
                      const [returnedSharedMatch] = await db
                        .insert(sharedMatch)
                        .values({
                          ownerId: returnedUserShareRequest.ownerId,
                          sharedWithId: returnedUserShareRequest.sharedWithId,
                          matchId: cShareRequest.itemId,
                          sharedGameId: returnedSharedGame.id,
                          sharedLocationId: sharedLocationForMatch?.id ?? null,
                          permission: cShareRequest.permission,
                        })
                        .returning();
                      if (!returnedSharedMatch) {
                        throw new Error(
                          "Shared Match not created successfully",
                        );
                      }

                      const returnedMatchPlayers =
                        await db.query.matchPlayer.findMany({
                          where: {
                            matchId: cShareRequest.itemId,
                          },
                        });
                      const sharedMatchPlayersToInsert: z.infer<
                        typeof insertSharedMatchPlayerSchema
                      >[] = await Promise.all(
                        returnedMatchPlayers.map(
                          async (returnedMatchPlayer) => {
                            const existingSharedPlayer =
                              await db.query.sharedPlayer.findFirst({
                                where: {
                                  ownerId: returnedUserShareRequest.ownerId,
                                  sharedWithId:
                                    returnedUserShareRequest.sharedWithId ?? 0,
                                  playerId: returnedMatchPlayer.playerId,
                                },
                              });
                            if (existingSharedPlayer) {
                              return {
                                matchPlayerId: returnedMatchPlayer.id,
                                sharedPlayerId: existingSharedPlayer.id,
                                ownerId: returnedUserShareRequest.ownerId,
                                sharedWithId:
                                  returnedUserShareRequest.sharedWithId ?? 0,
                                sharedMatchId: returnedSharedMatch.id,
                                permission: cShareRequest.permission,
                              };
                            }
                            return {
                              matchPlayerId: returnedMatchPlayer.id,
                              ownerId: returnedUserShareRequest.ownerId,
                              sharedWithId:
                                returnedUserShareRequest.sharedWithId ?? 0,
                              sharedMatchId: returnedSharedMatch.id,
                              permission: cShareRequest.permission,
                            };
                          },
                        ),
                      );
                      await db
                        .insert(sharedMatchPlayer)
                        .values(sharedMatchPlayersToInsert);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
