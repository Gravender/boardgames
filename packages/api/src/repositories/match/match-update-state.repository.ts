import { eq } from "drizzle-orm";

import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";
import { match } from "@board-games/db/schema";

import type {
  FinishMatchRepoArgs,
  MatchPauseRepoArgs,
  MatchResetDurationRepoArgs,
  MatchStartRepoArgs,
  UpdateMatchCommentRepoArgs,
} from "./match-update-state.repository.types";

class MatchUpdateStateRepository {
  public async updateMatchRunning(args: {
    input: { id: number; running: boolean };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(match)
      .set({ running: input.running })
      .where(eq(match.id, input.id));
  }

  public async updateMatchFinished(args: {
    input: { id: number; finished: boolean };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(match)
      .set({ finished: input.finished })
      .where(eq(match.id, input.id));
  }

  public async updateMatchDuration(args: {
    input: { id: number; duration: number };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(match)
      .set({ duration: input.duration })
      .where(eq(match.id, input.id));
  }

  public async updateMatchStartTime(args: {
    input: { id: number; startTime: Date | null };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(match)
      .set({ startTime: input.startTime })
      .where(eq(match.id, input.id));
  }

  public async updateMatchEndTime(args: {
    input: { id: number; endTime: Date | null };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(match)
      .set({ endTime: input.endTime })
      .where(eq(match.id, input.id));
  }

  public async matchStart(args: MatchStartRepoArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(match)
      .set({ running: true, finished: false, startTime: new Date() })
      .where(eq(match.id, input.id));
  }

  public async matchPause(args: MatchPauseRepoArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(match)
      .set({
        duration: input.duration,
        running: false,
        startTime: null,
        endTime: new Date(),
      })
      .where(eq(match.id, input.id));
  }

  public async matchResetDuration(args: MatchResetDurationRepoArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(match)
      .set({ duration: 0, running: false, startTime: null, endTime: null })
      .where(eq(match.id, input.id));
  }

  public async updateMatchComment(args: UpdateMatchCommentRepoArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(match)
      .set({ comment: input.comment })
      .where(eq(match.id, input.matchId));
  }

  public async finishMatch(args: FinishMatchRepoArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(match)
      .set({
        duration: input.duration,
        running: input.running,
        startTime: input.startTime,
        endTime: input.endTime,
        finished: input.finished,
      })
      .where(eq(match.id, input.id));
  }
}

export const matchUpdateStateRepository = new MatchUpdateStateRepository();
