import { relations } from "drizzle-orm";
import { integer, serial, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";
import match from "./match";
import matchPlayers from "./matchPlayer";

const teams = createTable("team", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  matchId: integer("match_id")
    .notNull()
    .references(() => match.id),

  details: text("details"),
});

export const teamRelations = relations(teams, ({ one, many }) => ({
  match: one(match, { fields: [teams.matchId], references: [match.id] }),
  matchPlayers: many(matchPlayers),
}));

export const insertTeamSchema = createInsertSchema(teams);
export const selectTeamSchema = createSelectSchema(teams);

export default teams;
