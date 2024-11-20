import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTableCreator,
  serial,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `boardgames_${name}`);

export const users = createTable("user", {
  id: varchar("id", { length: 255 }).notNull().primaryKey(),
  clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
    () => new Date(),
  ),
});
export const games = createTable(
  "game",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 256 }),
    userId: varchar("user_id", { length: 256 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
    gameImg: varchar("game_img", { length: 256 }),
    ownedBy: integer("owned_by"),
    playersMin: integer("players_min"),
    playersMax: integer("players_max"),
    playtimeMin: integer("playtime_min"),
    playtimeMax: integer("playtime_max"),
    yearPublished: integer("year_published"),
  },
  (table) => ({
    userIndex: index().on(table.userId),
  }),
);
export const matches = createTable(
  "match",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 256 })
      .notNull()
      .references(() => users.id),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
    date: timestamp("date", { withTimezone: true }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
  },
  (table) => ({
    gameIndex: index().on(table.gameId),
    userIndex: index().on(table.userId),
  }),
);
export const scoresheets = createTable(
  "scoresheet",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 256 }),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id),
    matchId: integer("matches_id")
      .notNull()
      .references(() => matches.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
    isCoop: boolean("is_coop"),
    winCondition: varchar("win_condition", { length: 256 }),
    roundsScore: varchar("rounds_score", { length: 256 }),
  },
  (table) => ({
    matchIndex: index().on(table.matchId),
    gameIndex: index().on(table.gameId),
  }),
);
export const rounds = createTable(
  "round",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 256 }),
    scoresheetId: integer("scoresheet_id")
      .notNull()
      .references(() => scoresheets.id),
    type: varchar("type", { length: 256 }),
    color: varchar("color", { length: 256 }),
    score: integer("score"),
    winCondition: integer("win_condition"),
    toggleScore: integer("toggle_score"),
    modifier: integer("modifier"),
    lookup: integer("lookup"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => ({
    scoresheetIndex: index().on(table.scoresheetId),
  }),
);
export const players = createTable(
  "player",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 256 }).references(() => users.id),
    name: varchar("name", { length: 256 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (example) => ({
    nameIndex: index("name_idx").on(example.name),
  }),
);
export const matchPlayers = createTable(
  "match_player",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
  },
  (table) => {
    return {
      uniqueMatchPlayer: unique().on(table.matchId, table.playerId),
    };
  },
);
