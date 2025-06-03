import type { z } from "zod/v4";
import { faker } from "@faker-js/faker";

import type {
  insertRoundSchema,
  insertScoreSheetSchema,
} from "@board-games/db/zodSchema";
import { db } from "@board-games/db/client";
import { round, scoresheet } from "@board-games/db/schema";

import { resetTable } from "./seed";

export async function seedScoresheets(d3Seed: number) {
  faker.seed(d3Seed);
  await resetTable(scoresheet);
  await resetTable(round);
  const games = await db.query.game.findMany();
  console.log("Inserting scoresheets...\n");
  for (const game of games) {
    const scoresheetCount = faker.number.int({
      min: 2,
      max: 3,
    });
    const scoresheetData: z.infer<typeof insertScoreSheetSchema>[] = [];
    for (let i = 0; i < scoresheetCount; i++) {
      const winCondition = faker.helpers.weightedArrayElement([
        { weight: 0.05, value: "Manual" },
        { weight: 0.42, value: "Highest Score" },
        { weight: 0.41, value: "Lowest Score" },
        { weight: 0.01, value: "No Winner" },
        { weight: 0.1, value: "Target Score" },
      ]);
      if (i === 0) {
        scoresheetData.push({
          name: `${game.name} Default`,
          gameId: game.id,
          userId: game.userId,
          winCondition: winCondition,
          roundsScore: faker.helpers.weightedArrayElement([
            { weight: 0.7, value: "Aggregate" },
            { weight: 0.05, value: "Manual" },
            { weight: 0.15, value: "Best Of" },
          ]),
          targetScore:
            winCondition === "Target Score"
              ? faker.number.int({ min: 10, max: 100 })
              : undefined,
          type: "Default",
          isCoop: faker.datatype.boolean(0.1),
        });
      } else {
        scoresheetData.push({
          name: `${game.name} Scoresheet ${i + 1}`,
          gameId: game.id,
          userId: game.userId,
          winCondition: winCondition,
          roundsScore: faker.helpers.weightedArrayElement([
            { weight: 0.7, value: "Aggregate" },
            { weight: 0.05, value: "Manual" },
            { weight: 0.15, value: "Best Of" },
          ]),
          targetScore:
            winCondition === "Target Score"
              ? faker.number.int({ min: 10, max: 100 })
              : undefined,
          type: "Game",
          isCoop: faker.datatype.boolean(0.1),
        });
      }
    }
    const returnedScoresheets = await db
      .insert(scoresheet)
      .values(scoresheetData)
      .returning();
    for (const returnedScoresheet of returnedScoresheets) {
      const roundData: z.infer<typeof insertRoundSchema>[] = Array.from(
        { length: faker.number.int({ min: 1, max: 8 }) },
        (_, index) => {
          const type = faker.helpers.weightedArrayElement([
            { weight: 0.8, value: "Numeric" },
            { weight: 0.2, value: "Checkbox" },
          ]);
          return {
            name: `Round ${index + 1}`,
            scoresheetId: returnedScoresheet.id,
            type: type,
            color: faker.helpers.arrayElement([
              "#64748b",
              "#ef4444",
              "#f97316",
              "#f59e0b",
              "#eab308",
              "#84cc16",
              "#22c55e",
              "#10b981",
              "#14b8a6",
              "#06b6d4",
              "#0ea5e9",
              "#3b82f6",
              "#6366f1",
              "#8b5cf6",
              "#a855f7",
              "#d946ef",
              "#ec4899",
              "#f43f5e",
            ]),
            score:
              type === "Checkbox" ? faker.number.int({ min: 1, max: 10 }) : 0,
            order: index + 1,
          };
        },
      );
      await db.insert(round).values(roundData);
    }
  }
}
