import type { GetGroupWithPlayersType } from "../group.output";
import type { GetGroupsWithPlayersArgs } from "./group.service.types";
import { groupRepository } from "../repository/group.repository";

class GroupService {
  public async getGroupsWithPlayers(
    args: GetGroupsWithPlayersArgs,
  ): Promise<GetGroupWithPlayersType> {
    const response = await groupRepository.getGroupsWithPlayers({
      createdBy: args.ctx.userId,
    });
    const mappedGroup = response.map((row) => ({
      id: row.id,
      name: row.name,
      matches: Number(row.finishedMatchCount),
      players: row.players.map((player) => ({
        id: player.id,
        type: "original" as const,
        name: player.name,
      })),
    }));
    mappedGroup.sort((a, b) => {
      if (a.matches > b.matches) {
        return -1;
      }
      if (a.matches < b.matches) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });
    return {
      groups: mappedGroup,
    };
  }
}
export const groupService = new GroupService();
