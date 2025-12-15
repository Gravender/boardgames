// Shared database cleanup utilities
// This file can be extended with common cleanup functions used across test categories

import { deleteGames } from "../game/helpers";
import { deletePlayers } from "../player/helpers";

export async function cleanupAll(browserName: string) {
  await deleteGames(browserName);
  await deletePlayers(browserName);
}
