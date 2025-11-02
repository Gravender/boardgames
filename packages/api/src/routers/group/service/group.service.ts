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
    const mappedGroup = response.map((group) => {
      const firstPlayer = group.players[0];
      if (firstPlayer) {
        let sharedMatchIds = new Set(firstPlayer.matches.map((m) => m.id));
        for (const player of group.players) {
          const playerMatchIds = new Set(player.matches.map((m) => m.id));
          sharedMatchIds = new Set(
            [...sharedMatchIds].filter((id) => playerMatchIds.has(id)),
          );
        }
        return {
          id: group.id,
          name: group.name,
          players: group.players.map((player) => {
            return {
              id: player.id,
              type: "original" as const,
              name: player.name,
            };
          }),
          matches: sharedMatchIds.size,
        };
      }
      return {
        id: group.id,
        name: group.name,
        matches: 0,
        players: [],
      };
    });
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
      groups: mappedGroup.filter((g) => g.players.length > 0),
    };
  }
}
export const groupService = new GroupService();
