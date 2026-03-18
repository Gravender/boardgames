import { db } from "@board-games/db/client";

import type {
  GetOriginalPlayerByIdArgs,
  GetSharedPlayerByIdArgs,
} from "./player.repository.types";

export async function getOriginalPlayerByIdRead(
  args: GetOriginalPlayerByIdArgs,
) {
  const database = args.tx ?? db;
  return database.query.player.findFirst({
    where: {
      id: args.id,
      createdBy: args.createdBy,
      deletedAt: {
        isNull: true,
      },
    },
    with: {
      image: true,
      matchPlayers: {
        with: {
          match: {
            with: {
              game: {
                with: {
                  image: true,
                },
              },
              matchPlayers: {
                with: {
                  player: {
                    with: {
                      image: true,
                    },
                  },
                },
              },
              location: true,
              teams: true,
              scoresheet: true,
            },
          },
        },
      },
      sharedLinkedPlayers: {
        with: {
          sharedMatchPlayers: {
            where: {
              sharedWithId: args.createdBy,
            },
            with: {
              matchPlayer: true,
              sharedMatch: {
                with: {
                  sharedGame: {
                    with: {
                      game: {
                        with: {
                          image: true,
                        },
                      },
                      linkedGame: {
                        where: {
                          createdBy: args.createdBy,
                        },
                        with: {
                          image: true,
                        },
                      },
                    },
                  },
                  sharedMatchPlayers: {
                    where: {
                      sharedWithId: args.createdBy,
                    },
                    with: {
                      sharedPlayer: {
                        where: {
                          sharedWithId: args.createdBy,
                        },
                        with: {
                          player: {
                            with: {
                              image: true,
                            },
                          },
                          linkedPlayer: {
                            where: {
                              createdBy: args.createdBy,
                            },
                            with: {
                              image: true,
                            },
                          },
                        },
                      },
                      matchPlayer: true,
                    },
                  },
                  match: {
                    with: {
                      location: true,
                      teams: true,
                      scoresheet: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getSharedPlayerByIdRead(args: GetSharedPlayerByIdArgs) {
  const database = args.tx ?? db;
  return database.query.sharedPlayer.findFirst({
    where: {
      id: args.id,
      sharedWithId: args.sharedWithId,
    },
    with: {
      player: {
        with: {
          image: true,
        },
      },
      sharedMatchPlayers: {
        where: {
          sharedWithId: args.sharedWithId,
        },
        with: {
          matchPlayer: true,
          sharedMatch: {
            with: {
              sharedGame: {
                with: {
                  game: {
                    with: {
                      image: true,
                    },
                  },
                  linkedGame: {
                    where: {
                      createdBy: args.sharedWithId,
                    },
                    with: {
                      image: true,
                    },
                  },
                },
              },
              sharedMatchPlayers: {
                where: {
                  sharedWithId: args.sharedWithId,
                },
                with: {
                  sharedPlayer: {
                    where: {
                      sharedWithId: args.sharedWithId,
                    },
                    with: {
                      player: {
                        with: {
                          image: true,
                        },
                      },
                      linkedPlayer: {
                        where: {
                          createdBy: args.sharedWithId,
                        },
                        with: {
                          image: true,
                        },
                      },
                    },
                  },
                  matchPlayer: true,
                },
              },
              match: {
                with: {
                  location: true,
                  teams: true,
                  scoresheet: true,
                },
              },
            },
          },
        },
      },
    },
  });
}
