import { integer, primaryKey } from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import game from "./game";
import tag from "./tag";

const gameTags = createTable(
  "game_tag",
  {
    gameId: integer("game_id")
      .notNull()
      .references(() => game.id),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tag.id),
  },
  (table) => [
    primaryKey({
      columns: [table.gameId, table.tagId],
    }),
  ],
);

export default gameTags;
