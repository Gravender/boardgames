import type { RouterInputs } from "@board-games/api";

import { createTrpcCaller } from "../trpc/trpc-helper";

type CreateGameInputType = RouterInputs["game"]["create"];
type CreateMatchInputType = RouterInputs["match"]["createMatch"];

/**
 * Creates a game using tRPC directly (bypassing UI).
 * This is useful for setting up test data quickly.
 * The game name will be generated as `{browserName}_{GAME_NAME}`.
 *
 * @param browserName - The browser name used to identify the test user
 * @param browserGameName - The name of the game to create
 * @param overrides - Optional game data overrides (defaults will be used if not provided)
 * @returns The created game
 */
export async function createGameViaTrpc(
  browserName: string,
  browserGameName: string,
  overrides?: {
    game?: Partial<Omit<CreateGameInputType["game"], "name">> & {
      name?: string;
    };
    image?: CreateGameInputType["image"];
    scoresheets?: CreateGameInputType["scoresheets"];
    roles?: CreateGameInputType["roles"];
  },
) {
  const gameData: CreateGameInputType = {
    game: {
      playersMin: 1,
      playersMax: 4,
      playtimeMin: 15,
      playtimeMax: 30,
      yearPublished: 2014,
      ownedBy: false,
      description: null,
      rules: null,
      ...overrides?.game,
      // Ensure name is always set to browserGameName unless explicitly overridden
      name: overrides?.game?.name ?? browserGameName,
    },
    image: overrides?.image ?? null,
    scoresheets: overrides?.scoresheets ?? [],
    roles: overrides?.roles ?? [],
  };

  const caller = createTrpcCaller(browserName);
  const result = await caller.game.create(gameData);
  return result;
}

/**
 * Deletes a game using tRPC directly (bypassing UI).
 * This is useful for cleaning up test data.
 *
 * @param browserName - The browser name used to identify the test user
 * @param gameId - The ID of the game to delete
 */
export async function deleteGameViaTrpc(browserName: string, gameId: number) {
  const caller = createTrpcCaller(browserName);
  await caller.game.deleteGame({ id: gameId });
}

/**
 * Creates a game with scoresheets using tRPC directly (bypassing UI).
 * This is a convenience function for creating games with scoresheet configurations.
 *
 * @param browserName - The browser name used to identify the test user
 * @param browserGameName - The name of the game to create
 * @param scoresheetConfigs - Array of scoresheet configurations
 * @param gameOverrides - Optional game data overrides
 * @returns The created game
 */
export async function createGameWithScoresheetViaTrpc(
  browserName: string,
  browserGameName: string,
  scoresheetConfigs: {
    name: string;
    winCondition:
      | "Manual"
      | "Highest Score"
      | "Lowest Score"
      | "No Winner"
      | "Target Score";
    isCoop?: boolean;
    isDefault?: boolean;
    roundsScore?: "Aggregate" | "Manual" | "Best Of" | "None";
    targetScore?: number;
    rounds?: {
      name: string;
      type?: "Numeric" | "Checkbox";
      score?: number;
      color?: string;
      lookup?: number;
      modifier?: number;
    }[];
  }[],
  gameOverrides?: Partial<CreateGameInputType["game"]>,
) {
  const scoresheets: CreateGameInputType["scoresheets"] = scoresheetConfigs.map(
    (config) => ({
      scoresheet: {
        name: config.name,
        isDefault: config.isDefault ?? false,
        winCondition: config.winCondition,
        isCoop: config.isCoop ?? false,
        targetScore: config.targetScore ?? 0,
        roundsScore: config.roundsScore ?? "Aggregate",
      },
      rounds:
        config.rounds?.map((round) => ({
          name: round.name,
          type: round.type ?? "Numeric",
          score: round.score ?? 0,
          color: round.color ?? "#cbd5e1",
          lookup: round.lookup ?? null,
          modifier: round.modifier ?? null,
          order: 0, // Will be set by the API
        })) ?? [],
    }),
  );

  return createGameViaTrpc(browserName, browserGameName, {
    game: gameOverrides,
    scoresheets,
  });
}

// ─── Match helpers ────────────────────────────────────────────────────────

/**
 * Creates players via tRPC directly (bypassing UI).
 *
 * @param browserName - The browser name used to identify the test user
 * @param count - Number of players to create
 * @param prefix - Prefix for player names
 * @returns Array of created players with { id, name }
 */
export async function createPlayersViaTrpc(
  browserName: string,
  count: number,
  prefix = "Player",
): Promise<{ id: number; name: string }[]> {
  const caller = createTrpcCaller(browserName);
  const players: { id: number; name: string }[] = [];
  for (let i = 1; i <= count; i++) {
    const player = await caller.player.create({
      name: `${prefix} ${i}`,
      imageId: null,
    });
    players.push(player);
  }
  return players;
}

/**
 * Creates a full match (game + scoresheet + players + match) using tRPC
 * directly (bypassing UI). Useful for setting up test data for score entry,
 * finish, and delete Playwright tests.
 *
 * @param browserName - The browser name used to identify the test user
 * @param browserGameName - The name of the game to create
 * @param options - Optional match creation overrides
 * @returns Created match, gameId, scoresheetId, and player ids
 */
interface TeamConfig {
  name: string;
  /** 0-based indices into the players array */
  playerIndices: number[];
}

export async function createFullMatchViaTrpc(
  browserName: string,
  browserGameName: string,
  options?: {
    matchName?: string;
    matchDate?: Date;
    playerCount?: number;
    playerPrefix?: string;
    scoresheetConfigs?: Parameters<typeof createGameWithScoresheetViaTrpc>[2];
    teams?: TeamConfig[];
    /** Reuse an existing game instead of creating a new one */
    existingGameId?: number;
    /** Reuse an existing scoresheet instead of looking one up */
    existingScoresheetId?: number;
    /** Reuse existing players instead of creating new ones */
    existingPlayers?: { id: number; name: string }[];
  },
) {
  const {
    matchName,
    matchDate = new Date(),
    playerCount = 2,
    playerPrefix = "Player",
    scoresheetConfigs,
    teams: teamConfigs,
    existingGameId,
    existingScoresheetId,
    existingPlayers,
  } = options ?? {};

  const caller = createTrpcCaller(browserName);

  // Create or reuse game
  let gameId: number;
  if (existingGameId) {
    gameId = existingGameId;
  } else if (scoresheetConfigs) {
    const createdGame = await createGameWithScoresheetViaTrpc(
      browserName,
      browserGameName,
      scoresheetConfigs,
    );
    gameId = createdGame.id;
  } else {
    const createdGame = await createGameViaTrpc(browserName, browserGameName);
    gameId = createdGame.id;
  }

  // Fetch or reuse scoresheet id
  let scoresheetId: number;
  if (existingScoresheetId) {
    scoresheetId = existingScoresheetId;
  } else {
    const scoresheets = await caller.game.gameScoreSheetsWithRounds({
      type: "original",
      id: gameId,
    });
    const firstScoresheet = scoresheets[0];
    if (firstScoresheet?.type !== "original") {
      throw new Error("No default scoresheet found for created game");
    }
    scoresheetId = firstScoresheet.id;
  }

  // Create or reuse players
  const players =
    existingPlayers ??
    (await createPlayersViaTrpc(browserName, playerCount, playerPrefix));

  // Build team assignments
  const teamAssignments = new Map<number, number>(); // playerIndex -> teamId
  const teamsInput: CreateMatchInputType["teams"] = [];
  if (teamConfigs) {
    teamConfigs.forEach((team, teamIdx) => {
      const teamId = teamIdx + 1; // 1-based synthetic team id
      teamsInput.push({ id: teamId, name: team.name, roles: [] });
      team.playerIndices.forEach((playerIdx) => {
        teamAssignments.set(playerIdx, teamId);
      });
    });
  }

  // Create match
  const matchInput: CreateMatchInputType = {
    name: matchName ?? `${browserGameName} Match #1`,
    date: matchDate,
    game: { type: "original", id: gameId },
    scoresheet: { type: "original", id: scoresheetId },
    players: players.map((p, idx) => ({
      type: "original" as const,
      id: p.id,
      roles: [],
      teamId: teamAssignments.get(idx) ?? null,
    })),
    teams: teamsInput,
    location: null,
  };

  const match = await caller.match.createMatch(matchInput);

  return {
    match,
    gameId,
    scoresheetId,
    players,
  };
}

/**
 * Finishes an existing match via tRPC by setting round scores, computing
 * final scores, and assigning placements. The match must already exist.
 *
 * @param browserName - The browser name used to identify the test user
 * @param matchId - The ID of the match to finish
 * @param playerScores - Array of scores, one per player (in creation order)
 * @param winCondition - The win condition (determines placement ordering)
 */
export async function finishMatchViaTrpc(
  browserName: string,
  matchId: number,
  playerScores: number[],
  winCondition:
    | "Highest Score"
    | "Lowest Score"
    | "Target Score"
    | "No Winner"
    | "Manual" = "Highest Score",
) {
  const caller = createTrpcCaller(browserName);
  const matchInput = { type: "original" as const, id: matchId };

  // Get match players and their rounds
  const playersAndTeams =
    await caller.match.getMatchPlayersAndTeams(matchInput);

  // Check if this is a team match (players have teamIds)
  const isTeamMatch = playersAndTeams.teams.length > 0;

  if (isTeamMatch) {
    // For team matches, set scores per team via the first player of each team
    const teamPlayers = new Map<number, typeof playersAndTeams.players>();
    for (const player of playersAndTeams.players) {
      if (player.teamId !== null) {
        const existing = teamPlayers.get(player.teamId) ?? [];
        existing.push(player);
        teamPlayers.set(player.teamId, existing);
      }
    }

    // Set round scores for each team (using teamId-based scoring)
    let teamIdx = 0;
    for (const [teamId, teamPlayersList] of teamPlayers) {
      const score = playerScores[teamIdx] ?? 0;
      const firstPlayer = teamPlayersList[0];
      if (firstPlayer && firstPlayer.rounds.length > 0) {
        for (const round of firstPlayer.rounds) {
          await caller.match.update.updateMatchRoundScore({
            type: "team",
            match: matchInput,
            teamId,
            round: { id: round.roundId, score },
          });
        }
      }
      teamIdx++;
    }
  } else {
    // Set round scores for individual players
    for (let i = 0; i < playersAndTeams.players.length; i++) {
      const player = playersAndTeams.players[i];
      if (!player) continue;
      const score = playerScores[i] ?? 0;
      for (const round of player.rounds) {
        await caller.match.update.updateMatchRoundScore({
          type: "player",
          match: matchInput,
          matchPlayerId: player.baseMatchPlayerId,
          round: { id: round.roundId, score },
        });
      }
    }
  }

  // Calculate final scores
  await caller.match.update.updateMatchFinalScores(matchInput);

  if (winCondition === "Manual") {
    // For manual win condition, mark all players as winners (or customize as needed)
    const winners = playersAndTeams.players.map((p) => ({
      id: p.baseMatchPlayerId,
    }));
    await caller.match.update.updateMatchManualWinner({
      match: matchInput,
      winners,
    });
  } else {
    // Get updated players with computed scores
    const updated = await caller.match.getMatchPlayersAndTeams(matchInput);

    // Compute placements from scores
    const scoredPlayers = updated.players.map((p) => ({
      id: p.baseMatchPlayerId,
      score: p.score ?? 0,
    }));

    // Remove duplicates for team matches (all team members share the same score)
    const uniquePlayers = isTeamMatch
      ? scoredPlayers.filter(
          (p, idx, arr) =>
            arr.findIndex((x) => x.score === p.score && x.id === p.id) === idx,
        )
      : scoredPlayers;

    const sorted = [...uniquePlayers].sort((a, b) => {
      if (winCondition === "Lowest Score") return a.score - b.score;
      return b.score - a.score; // Highest Score, Target Score, No Winner
    });

    const placements = sorted.map((s, i) => ({
      id: s.id,
      placement: i + 1,
    }));

    await caller.match.update.updateMatchPlacements({
      match: matchInput,
      playersPlacement: placements,
    });
  }
}

/**
 * Convenience: creates a full match AND finishes it in one call.
 * Returns everything needed to navigate to the summary page.
 */
export async function createAndFinishMatchViaTrpc(
  browserName: string,
  browserGameName: string,
  options: {
    matchName?: string;
    matchDate?: Date;
    playerCount?: number;
    playerPrefix?: string;
    scoresheetConfigs?: Parameters<typeof createGameWithScoresheetViaTrpc>[2];
    teams?: TeamConfig[];
    /** One score per player (or per team for team matches), in creation order */
    playerScores: number[];
    winCondition?:
      | "Highest Score"
      | "Lowest Score"
      | "Target Score"
      | "No Winner"
      | "Manual";
    /** Reuse an existing game instead of creating a new one */
    existingGameId?: number;
    /** Reuse an existing scoresheet instead of looking one up */
    existingScoresheetId?: number;
    /** Reuse existing players instead of creating new ones */
    existingPlayers?: { id: number; name: string }[];
  },
) {
  const {
    playerScores,
    winCondition = "Highest Score",
    ...createOptions
  } = options;

  const result = await createFullMatchViaTrpc(
    browserName,
    browserGameName,
    createOptions,
  );

  await finishMatchViaTrpc(
    browserName,
    result.match.id,
    playerScores,
    winCondition,
  );

  return result;
}
