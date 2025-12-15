import { eq, inArray } from "drizzle-orm";

import { db } from "@board-games/db/client";
import { player, user } from "@board-games/db/schema";

import { getBetterAuthUserId } from "../getUserId";
import { EDITED_PLAYER_NAME, PLAYER_NAME } from "../shared/test-data";

export async function deletePlayers(browserName: string) {
  const betterAuthUserId = getBetterAuthUserId(browserName);
  const [returnedUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, betterAuthUserId));
  if (returnedUser) {
    const browserPlayerName = browserName + "_" + PLAYER_NAME;
    const editedBrowserPlayerName = browserName + "_" + EDITED_PLAYER_NAME;
    const returnedPlayers = await db.query.player.findMany({
      where: {
        createdBy: returnedUser.id,
        name: {
          OR: [browserPlayerName, editedBrowserPlayerName],
        },
      },
    });
    if (returnedPlayers.length > 0) {
      await db.delete(player).where(
        inArray(
          player.id,
          returnedPlayers.map((p) => p.id),
        ),
      );
    }
  }
}

export function playerAriaText(playerName: string) {
  const temp = `
      - listitem:
        - 'link "${playerName} Game: Last Played:"':
          - /url: //dashboard/players/\\d+/stats/
          - heading "${playerName}" [level=2]
        - button "0"
        - button "Open menu"
      `;
  return temp;
}
