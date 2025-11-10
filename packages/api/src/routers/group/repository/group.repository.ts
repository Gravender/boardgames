import { db } from "@board-games/db/client";

import type { GetGroupsWithPlayersArgs } from "./group.repository.types";

class GroupRepository {
  public async getGroupsWithPlayers(args: GetGroupsWithPlayersArgs) {
    const response = await db.query.group.findMany({
      where: {
        createdBy: args.createdBy,
      },
      columns: {
        id: true,
        name: true,
      },
      with: {
        players: {
          columns: {
            id: true,
            name: true,
          },
          with: {
            matches: {
              where: {
                finished: true,
              },
              columns: {
                id: true,
              },
            },
          },
        },
      },
    });

    return response;
  }
}
export const groupRepository = new GroupRepository();
