import { db } from "@board-games/db/client";
import type { TransactionType } from "@board-games/db/client";

import { assertFound } from "../../utils/databaseHelpers";
import type {
  GetPlayerCountStatsOutputType,
  GetPlayerFavoriteGamesOutputType,
  GetPlayerGameWinRateChartsOutputType,
  GetPlayerPerformanceSummaryOutputType,
  GetPlayerPlacementDistributionOutputType,
  GetPlayerPlayedWithGroupsOutputType,
  GetPlayerRecentMatchesOutputType,
  GetPlayerStreaksOutputType,
  GetPlayerTopRivalsOutputType,
  GetPlayerTopTeammatesOutputType,
  PlayerInsightsIdentityType,
  PlayerInsightsMatchEntryType,
  PlayerInsightsPlayedWithGroupType,
  PlayerInsightsTargetType,
} from "../../routers/player/player.output";
import type { GetPlayerInputType } from "../../routers/player/player.input";
import { playerInsightsRepository } from "../../repositories/player/player-insights.repository";
import { matchRepository } from "../../repositories/match/match.repository";
import { playerRepository } from "../../repositories/player/player.repository";
import { mapPlayerImageRowWithLogging } from "../../utils/image";
import { kCombinations } from "../../utils/combinations";
import { playerInsightsMatchQueryService } from "./player-insights-match-query.service";
import type { GetPlayerInsightsArgs } from "./player.service.types";

/** Minimum head-to-head or co-op games together to list someone as a rival or teammate. */
const MIN_RIVAL_OR_TEAMMATE_MATCHES = 5;

/** Played-with cohorts: at least two opponents; at most five (profile + five = 6). */
const MIN_COHORT_OPPONENTS = 2;
const MAX_COHORT_OPPONENTS = 5;
/** Aligned with game core detection (often 3+); 1 keeps thin histories visible. */
const MIN_MATCHES_PER_COHORT_GROUP = 5;
const MAX_PLAYED_WITH_GROUPS = 300;

const MS_PER_DAY = 86_400_000;
const ROLLING_DAYS = 365;
const rollingOneYearMs = (): number => ROLLING_DAYS * MS_PER_DAY;

const monthSlotForMatchInWindow = (
  matchDate: Date,
  windowStart: Date,
): number => {
  const anchor = new Date(
    Date.UTC(windowStart.getUTCFullYear(), windowStart.getUTCMonth(), 1),
  );
  const y = matchDate.getUTCFullYear();
  const m = matchDate.getUTCMonth();
  const ay = anchor.getUTCFullYear();
  const am = anchor.getUTCMonth();
  const slot = (y - ay) * 12 + (m - am) + 1;
  if (slot < 1) {
    return 1;
  }
  if (slot > 12) {
    return 12;
  }
  return slot;
};

const formatMonthLabelShortUtc = (d: Date): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(d);

const buildMonthSlotLabelsUtc = (windowStart: Date): string[] => {
  const anchor = new Date(
    Date.UTC(windowStart.getUTCFullYear(), windowStart.getUTCMonth(), 1),
  );
  const labels: string[] = [];
  let d = new Date(anchor);
  for (let i = 0; i < 12; i++) {
    labels.push(
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }).format(d),
    );
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  }
  return labels;
};

type RunningWinRatePoint = {
  matchDate: Date;
  matchIndex: number;
  cumulativeMatches: number;
  cumulativeWins: number;
  winRate: number;
};

const collapseRunningPointsByMonthSlot = (
  points: RunningWinRatePoint[],
  windowStart: Date,
): GetPlayerGameWinRateChartsOutputType["series"]["byTime"]["last12Months"] => {
  const withSlot = points.map((p) => ({
    ...p,
    monthSlot: monthSlotForMatchInWindow(new Date(p.matchDate), windowStart),
    monthLabelShort: formatMonthLabelShortUtc(new Date(p.matchDate)),
  }));
  const bySlot = new Map<number, (typeof withSlot)[number]>();
  for (const p of withSlot) {
    const prev = bySlot.get(p.monthSlot);
    if (
      !prev ||
      new Date(p.matchDate).getTime() > new Date(prev.matchDate).getTime()
    ) {
      bySlot.set(p.monthSlot, p);
    }
  }
  return [...bySlot.values()].toSorted((a, b) => a.monthSlot - b.monthSlot);
};

type InsightMatchRow = Awaited<
  ReturnType<typeof playerInsightsMatchQueryService.getPlayerInsightMatchRows>
>[number];

type InsightMatchParticipant = InsightMatchRow["participants"][number];

type CohortPairwiseAcc = {
  keyA: string;
  keyB: string;
  identityA: PlayerInsightsIdentityType;
  identityB: PlayerInsightsIdentityType;
  matches: number;
  winsA: number;
  lossesA: number;
  ties: number;
  placementDeltaSum: number;
  placementDeltaCount: number;
};

type CohortGroupAcc = {
  groupKey: string;
  members: PlayerInsightsIdentityType[];
  matches: number;
  sweptWins: number;
  exactMatches: number;
  placementSum: number;
  placementCount: number;
  scoreSum: number;
  scoreCount: number;
  recentMatches: PlayerInsightsMatchEntryType[];
  gameKeys: Set<string>;
  lastPlayedAt: Date | null;
  placementsByPlayerKey: Map<string, { sum: number; count: number }>;
  pairwise: Map<string, CohortPairwiseAcc>;
  identityByKey: Map<string, PlayerInsightsIdentityType>;
};

class PlayerInsightsReadService {
  private async getInsightsTarget(
    args: GetPlayerInsightsArgs,
    tx?: TransactionType,
  ): Promise<PlayerInsightsTargetType> {
    const { ctx, input } = args;
    if (input.type === "original") {
      const player = await playerRepository.getPlayer(
        {
          id: input.id,
          createdBy: ctx.userId,
        },
        tx,
      );
      assertFound(
        player,
        { userId: ctx.userId, value: input },
        "Player not found.",
      );
      return {
        type: "original",
        id: player.id,
        permissions: "edit",
      };
    }
    const sharedPlayer = await playerRepository.getSharedPlayer(
      {
        id: input.sharedPlayerId,
        sharedWithId: ctx.userId,
      },
      tx,
    );
    assertFound(
      sharedPlayer,
      { userId: ctx.userId, value: input },
      "Shared player not found.",
    );
    return {
      type: "shared",
      sharedPlayerId: sharedPlayer.id,
      permissions: sharedPlayer.permission,
    };
  }

  private async getRows(args: GetPlayerInsightsArgs) {
    const rows =
      await playerInsightsMatchQueryService.getPlayerInsightMatchRows(args);
    return rows.toSorted((a, b) => b.date.getTime() - a.date.getTime());
  }

  private isViewerSameAsProfileTarget(
    input: GetPlayerInputType,
    userPlayerId: number | null,
    sharedLinkedPlayerId: number | null,
  ): boolean {
    if (userPlayerId === null) return false;
    if (input.type === "original") return input.id === userPlayerId;
    return sharedLinkedPlayerId === userPlayerId;
  }

  /**
   * Matches SQL `insightWinSql` / `insightTieSql` in player-insights.repository.ts.
   * Tie outcomes do not advance or reset win streaks in {@link getPlayerStreaks}.
   */
  private getOutcomeLabelFromFields(args: {
    outcomeWinner: boolean | null;
    outcomePlacement: number | null;
    outcomeScore: number | null;
  }): "win" | "loss" | "tie" {
    if (args.outcomeWinner === true) {
      return "win";
    }
    if (args.outcomePlacement === null && args.outcomeScore === null) {
      return "tie";
    }
    if (args.outcomePlacement === 1) {
      return "win";
    }
    return "loss";
  }

  private getOutcomeLabel(row: InsightMatchRow): "win" | "loss" | "tie" {
    return this.getOutcomeLabelFromFields({
      outcomeWinner: row.outcomeWinner,
      outcomePlacement: row.outcomePlacement,
      outcomeScore: row.outcomeScore,
    });
  }

  /** Stable key for counting distinct games in insights (rivals / teammates / groups). */
  private gameIdentityKey(row: InsightMatchRow): string {
    if (row.sharedGameId != null) {
      return `shared-${row.sharedGameId}`;
    }
    return `game-${row.gameId}`;
  }

  private getTargetParticipant(args: {
    row: InsightMatchRow;
    input: GetPlayerInsightsArgs["input"];
  }) {
    const { row, input } = args;
    if (input.type === "original") {
      return row.participants.find(
        (participant) => participant.playerId === input.id,
      );
    }
    return row.participants.find(
      (participant) => participant.sharedPlayerId === input.sharedPlayerId,
    );
  }

  private async toIdentity(
    participant: InsightMatchParticipant,
    ctx: GetPlayerInsightsArgs["ctx"],
  ): Promise<PlayerInsightsIdentityType> {
    if (
      participant.playerType === "shared" &&
      participant.sharedPlayerId !== null
    ) {
      return {
        type: "shared",
        sharedId: participant.sharedPlayerId,
        id: participant.playerId,
        name: participant.name,
        image: await mapPlayerImageRowWithLogging({
          ctx,
          input: {
            image: participant.image,
            playerId: participant.playerId,
          },
        }),
      };
    }
    return {
      type: "original",
      id: participant.playerId,
      name: participant.name,
      image: await mapPlayerImageRowWithLogging({
        ctx,
        input: {
          image: participant.image,
          playerId: participant.playerId,
        },
      }),
    };
  }

  /**
   * Rivals head-to-head: better finish (lower placement number) wins. Same
   * placement ⇒ tie. For Manual win condition only: if both are marked winner
   * or neither is, count as tie; otherwise use placement when present, else
   * winner flags.
   */
  private compareRivalHeadToHead(args: {
    row: InsightMatchRow;
    target: InsightMatchParticipant;
    other: InsightMatchParticipant;
  }): "win" | "loss" | "tie" {
    const { row, target, other } = args;

    if (row.scoresheetWinCondition === "Manual") {
      const bothWon = target.winner === true && other.winner === true;
      const bothNotWinner = target.winner !== true && other.winner !== true;
      if (bothWon || bothNotWinner) {
        return "tie";
      }
    }

    if (target.placement !== null && other.placement !== null) {
      if (target.placement < other.placement) {
        return "win";
      }
      if (target.placement > other.placement) {
        return "loss";
      }
      return "tie";
    }

    if (target.winner === true && other.winner !== true) {
      return "win";
    }
    if (target.winner !== true && other.winner === true) {
      return "loss";
    }
    return "tie";
  }

  private participantIdentityKey(p: InsightMatchParticipant): string {
    if (p.playerType === "shared" && p.sharedPlayerId !== null) {
      return `shared-${p.sharedPlayerId}`;
    }
    return `original-${p.playerId}`;
  }

  private identityKeyFromIdentity(
    identity: PlayerInsightsIdentityType,
  ): string {
    return identity.type === "shared"
      ? `shared-${identity.sharedId}`
      : `original-${identity.id}`;
  }

  private async resolveProfileIdentityForGroups(
    args: GetPlayerInsightsArgs,
    rows: InsightMatchRow[],
  ): Promise<PlayerInsightsIdentityType> {
    for (const row of rows) {
      const t = this.getTargetParticipant({
        row,
        input: args.input,
      });
      if (t) {
        return this.toIdentity(t, args.ctx);
      }
    }
    if (args.input.type === "original") {
      const p = await playerRepository.getPlayer({
        id: args.input.id,
        createdBy: args.ctx.userId,
        with: {
          image: true,
        },
      });
      assertFound(
        p,
        { userId: args.ctx.userId, value: args.input },
        "Player not found.",
      );
      return {
        type: "original",
        id: p.id,
        name: p.name,
        image: await mapPlayerImageRowWithLogging({
          ctx: args.ctx,
          input: {
            image: p.image,
            playerId: p.id,
          },
        }),
      };
    }
    const sp = await playerRepository.getSharedPlayer({
      id: args.input.sharedPlayerId,
      sharedWithId: args.ctx.userId,
      with: {
        player: {
          with: {
            image: true,
          },
        },
      },
    });
    assertFound(
      sp,
      { userId: args.ctx.userId, value: args.input },
      "Shared player not found.",
    );
    return {
      type: "shared",
      sharedId: sp.id,
      id: sp.playerId,
      name: sp.player.name,
      image: await mapPlayerImageRowWithLogging({
        ctx: args.ctx,
        input: {
          image: sp.player.image,
          playerId: sp.playerId,
        },
      }),
    };
  }

  private bumpPlacementForKey(
    map: Map<string, { sum: number; count: number }>,
    key: string,
    placement: number | null,
  ) {
    if (placement === null) {
      return;
    }
    const cur = map.get(key);
    if (cur) {
      cur.sum += placement;
      cur.count += 1;
    } else {
      map.set(key, { sum: placement, count: 1 });
    }
  }

  private async buildPlayedWithGroups(args: {
    rows: InsightMatchRow[];
    input: GetPlayerInsightsArgs["input"];
    ctx: GetPlayerInsightsArgs["ctx"];
    profileIdentity: PlayerInsightsIdentityType;
  }): Promise<PlayerInsightsPlayedWithGroupType[]> {
    const profileKey = this.identityKeyFromIdentity(args.profileIdentity);
    const identityCache = new Map<string, PlayerInsightsIdentityType>();
    const getCachedIdentity = async (
      participant: InsightMatchParticipant,
    ): Promise<PlayerInsightsIdentityType> => {
      const k = this.participantIdentityKey(participant);
      const hit = identityCache.get(k);
      if (hit) {
        return hit;
      }
      const id = await this.toIdentity(participant, args.ctx);
      identityCache.set(k, id);
      return id;
    };

    const grouped = new Map<string, CohortGroupAcc>();

    for (const row of args.rows) {
      if (row.isCoop) {
        continue;
      }
      const targetParticipant = this.getTargetParticipant({
        row,
        input: args.input,
      });
      if (!targetParticipant) {
        continue;
      }

      const opponents = row.participants.filter((participant) => {
        if (participant.playerId === targetParticipant.playerId) {
          return false;
        }
        if (
          targetParticipant.teamId !== null &&
          participant.teamId === targetParticipant.teamId
        ) {
          return false;
        }
        return true;
      });

      if (opponents.length < MIN_COHORT_OPPONENTS) {
        continue;
      }

      const opponentsSorted = opponents.toSorted((a, b) =>
        this.participantIdentityKey(a).localeCompare(
          this.participantIdentityKey(b),
        ),
      );

      const matchEntry =
        await playerInsightsMatchQueryService.mapMatchEntryFromRow({
          ctx: args.ctx,
          input: {
            matchId: row.matchId,
            sharedMatchId: row.sharedMatchId,
            matchType: row.matchType,
            date: row.date,
            isCoop: row.isCoop,
            gameId: row.gameId,
            sharedGameId: row.sharedGameId,
            gameType: row.gameType,
            gameName: row.gameName,
            gameImage: row.gameImage,
            scoresheetWinCondition: row.scoresheetWinCondition,
            outcomePlacement: row.outcomePlacement,
            outcomeScore: row.outcomeScore,
            outcomeWinner: row.outcomeWinner,
            playerCount: row.participants.length,
          },
        });
      const gk = this.gameIdentityKey(row);

      const maxK = Math.min(MAX_COHORT_OPPONENTS, opponentsSorted.length);
      for (let k = MIN_COHORT_OPPONENTS; k <= maxK; k++) {
        const combos = kCombinations(opponentsSorted, k);
        for (const subset of combos) {
          const memberIdentities: PlayerInsightsIdentityType[] = [];
          for (const op of subset) {
            memberIdentities.push(await getCachedIdentity(op));
          }
          memberIdentities.sort((a, b) =>
            this.identityKeyFromIdentity(a).localeCompare(
              this.identityKeyFromIdentity(b),
            ),
          );
          const groupKey = memberIdentities
            .map((m) => this.identityKeyFromIdentity(m))
            .join("|");

          const swept = subset.every(
            (op) =>
              this.compareRivalHeadToHead({
                row,
                target: targetParticipant,
                other: op,
              }) === "win",
          );

          const cohortParticipants: InsightMatchParticipant[] = [
            targetParticipant,
            ...subset,
          ];
          const cohortSize = cohortParticipants.length;
          const isExact = row.participants.length === cohortSize ? 1 : 0;

          let acc = grouped.get(groupKey);
          if (!acc) {
            const identityByKey = new Map<string, PlayerInsightsIdentityType>();
            identityByKey.set(profileKey, args.profileIdentity);
            for (const m of memberIdentities) {
              identityByKey.set(this.identityKeyFromIdentity(m), m);
            }
            acc = {
              groupKey,
              members: memberIdentities,
              matches: 0,
              sweptWins: 0,
              exactMatches: 0,
              placementSum: 0,
              placementCount: 0,
              scoreSum: 0,
              scoreCount: 0,
              recentMatches: [],
              gameKeys: new Set<string>(),
              lastPlayedAt: null,
              placementsByPlayerKey: new Map(),
              pairwise: new Map<string, CohortPairwiseAcc>(),
              identityByKey,
            };
            grouped.set(groupKey, acc);
          }

          acc.matches += 1;
          if (swept) {
            acc.sweptWins += 1;
          }
          acc.exactMatches += isExact;

          if (row.outcomePlacement !== null) {
            acc.placementSum += row.outcomePlacement;
            acc.placementCount += 1;
          }
          if (row.outcomeScore !== null) {
            acc.scoreSum += row.outcomeScore;
            acc.scoreCount += 1;
          }
          acc.gameKeys.add(gk);
          if (acc.lastPlayedAt === null || row.date > acc.lastPlayedAt) {
            acc.lastPlayedAt = row.date;
          }
          acc.recentMatches = [...acc.recentMatches, matchEntry]
            .toSorted((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 5);

          this.bumpPlacementForKey(
            acc.placementsByPlayerKey,
            profileKey,
            targetParticipant.placement,
          );
          for (const op of subset) {
            this.bumpPlacementForKey(
              acc.placementsByPlayerKey,
              this.participantIdentityKey(op),
              op.placement,
            );
          }

          for (let i = 0; i < cohortParticipants.length; i++) {
            for (let j = i + 1; j < cohortParticipants.length; j++) {
              const pA = cohortParticipants[i]!;
              const pB = cohortParticipants[j]!;
              const kA = this.participantIdentityKey(pA);
              const kB = this.participantIdentityKey(pB);
              const firstKey = kA < kB ? kA : kB;
              const secondKey = kA < kB ? kB : kA;
              const firstP = kA < kB ? pA : pB;
              const secondP = kA < kB ? pB : pA;
              const pairKey = `${firstKey}|${secondKey}`;

              const r = this.compareRivalHeadToHead({
                row,
                target: firstP,
                other: secondP,
              });

              let pairAcc = acc.pairwise.get(pairKey);
              if (!pairAcc) {
                const identityA = acc.identityByKey.get(firstKey)!;
                const identityB = acc.identityByKey.get(secondKey)!;
                pairAcc = {
                  keyA: firstKey,
                  keyB: secondKey,
                  identityA,
                  identityB,
                  matches: 0,
                  winsA: 0,
                  lossesA: 0,
                  ties: 0,
                  placementDeltaSum: 0,
                  placementDeltaCount: 0,
                };
                acc.pairwise.set(pairKey, pairAcc);
              }
              pairAcc.matches += 1;
              if (r === "win") {
                pairAcc.winsA += 1;
              } else if (r === "loss") {
                pairAcc.lossesA += 1;
              } else {
                pairAcc.ties += 1;
              }
              if (firstP.placement !== null && secondP.placement !== null) {
                pairAcc.placementDeltaSum +=
                  secondP.placement - firstP.placement;
                pairAcc.placementDeltaCount += 1;
              }
            }
          }
        }
      }
    }

    const filtered = Array.from(grouped.values()).filter(
      (g) => g.matches >= MIN_MATCHES_PER_COHORT_GROUP,
    );

    return filtered
      .map((g): PlayerInsightsPlayedWithGroupType => {
        const stability = g.matches > 0 ? g.exactMatches / g.matches : 0;

        const cohortKeys = [
          profileKey,
          ...g.members.map((m) => this.identityKeyFromIdentity(m)),
        ];

        const groupOrdering = cohortKeys
          .map((key) => {
            const pl = g.placementsByPlayerKey.get(key);
            const avgPlacement =
              pl !== undefined && pl.count > 0 ? pl.sum / pl.count : null;
            const player = g.identityByKey.get(key);
            return {
              player: player!,
              avgPlacement,
              rank: 0,
            };
          })
          .toSorted((a, b) => {
            if (a.avgPlacement === null && b.avgPlacement === null) {
              return a.player.name.localeCompare(b.player.name);
            }
            if (a.avgPlacement === null) {
              return 1;
            }
            if (b.avgPlacement === null) {
              return -1;
            }
            if (a.avgPlacement !== b.avgPlacement) {
              return a.avgPlacement - b.avgPlacement;
            }
            return a.player.name.localeCompare(b.player.name);
          })
          .map((entry, idx) => ({
            player: entry.player,
            avgPlacement: entry.avgPlacement,
            rank: idx + 1,
          }));

        const pairwiseWithinCohort = Array.from(g.pairwise.values())
          .map((p) => ({
            playerA: p.identityA,
            playerB: p.identityB,
            matches: p.matches,
            winsA: p.winsA,
            lossesA: p.lossesA,
            ties: p.ties,
            winRateA: p.matches > 0 ? p.winsA / p.matches : 0,
            avgPlacementDeltaA:
              p.placementDeltaCount > 0
                ? p.placementDeltaSum / p.placementDeltaCount
                : null,
          }))
          .toSorted((a, b) => {
            const na = `${a.playerA.name}|${a.playerB.name}`;
            const nb = `${b.playerA.name}|${b.playerB.name}`;
            return na.localeCompare(nb);
          });

        return {
          groupKey: g.groupKey,
          profileInCohort: args.profileIdentity,
          members: g.members,
          matches: g.matches,
          winsWithGroup: g.sweptWins,
          winRateWithGroup: g.matches > 0 ? g.sweptWins / g.matches : 0,
          avgPlacement:
            g.placementCount > 0 ? g.placementSum / g.placementCount : null,
          avgScore: g.scoreCount > 0 ? g.scoreSum / g.scoreCount : null,
          uniqueGamesPlayed: g.gameKeys.size,
          lastPlayedAt: g.lastPlayedAt,
          recentMatches: g.recentMatches,
          stability,
          groupOrdering,
          pairwiseWithinCohort,
        };
      })
      .toSorted((a, b) => b.matches - a.matches)
      .slice(0, MAX_PLAYED_WITH_GROUPS);
  }

  public async getPlayerPerformanceSummary(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerPerformanceSummaryOutputType> {
    return db.transaction(async (tx) => {
      const player = await this.getInsightsTarget(args, tx);
      const repoArgs = {
        userId: args.ctx.userId,
        input: args.input,
        tx,
      };
      const rollup =
        await playerInsightsRepository.getPerformanceRollup(repoArgs);
      const recentForm = await playerInsightsRepository.getRecentForm(
        repoArgs,
        10,
      );
      return {
        player,
        overall: {
          totalMatches: rollup.totalMatches,
          wins: rollup.wins,
          losses: rollup.losses,
          ties: rollup.ties,
          winRate: rollup.winRate,
          avgPlacement: rollup.avgPlacement,
          avgScore: rollup.avgScore,
          totalPlaytime: rollup.totalPlaytime,
        },
        modeBreakdown: {
          coop: {
            matches: rollup.coopMatches,
            wins: rollup.coopWins,
            winRate:
              rollup.coopMatches > 0 ? rollup.coopWins / rollup.coopMatches : 0,
          },
          competitive: {
            matches: rollup.competitiveMatches,
            wins: rollup.competitiveWins,
            winRate:
              rollup.competitiveMatches > 0
                ? rollup.competitiveWins / rollup.competitiveMatches
                : 0,
          },
        },
        recentForm,
      };
    });
  }

  public async getPlayerFavoriteGames(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerFavoriteGamesOutputType> {
    return db.transaction(async (tx) => {
      const player = await this.getInsightsTarget(args, tx);
      const repoArgs = {
        userId: args.ctx.userId,
        input: args.input,
        tx,
      };
      const aggregates =
        await playerInsightsRepository.getFavoriteGamesAggregates(repoArgs);
      const games: GetPlayerFavoriteGamesOutputType["games"] = [];
      for (const row of aggregates) {
        const game = await playerInsightsMatchQueryService.mapGameEntryFromRow({
          ctx: args.ctx,
          input: {
            gameId: row.canonicalGameId,
            sharedGameId: row.sharedGameId,
            gameType: row.gameVisibilitySource,
            gameName: row.gameName,
            gameImage: row.gameImage,
          },
        });
        if (game.type === "shared") {
          games.push({
            type: "shared" as const,
            id: game.id,
            sharedGameId: game.sharedGameId,
            name: game.name,
            image: game.image,
            plays: row.plays,
            wins: row.wins,
            winRate: row.plays > 0 ? row.wins / row.plays : 0,
            avgScore: row.avgScore,
            lastPlayed: new Date(row.lastPlayed as string | Date),
          });
        } else {
          games.push({
            type: "original" as const,
            id: game.id,
            name: game.name,
            image: game.image,
            plays: row.plays,
            wins: row.wins,
            winRate: row.plays > 0 ? row.wins / row.plays : 0,
            avgScore: row.avgScore,
            lastPlayed: new Date(row.lastPlayed as string | Date),
          });
        }
      }
      const sorted = games.toSorted((a, b) => {
        if (a.plays !== b.plays) {
          return b.plays - a.plays;
        }
        return b.winRate - a.winRate;
      });
      return {
        player,
        games: sorted,
      };
    });
  }

  public async getPlayerRecentMatches(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerRecentMatchesOutputType> {
    return db.transaction(async (tx) => {
      const player = await this.getInsightsTarget(args, tx);
      const summaries =
        await playerInsightsMatchQueryService.getPlayerInsightMatchSummaries({
          ...args,
          tx,
          order: "desc",
        });

      const userPlayerId = await playerRepository.getUserPlayerIdForUser({
        userId: args.ctx.userId,
        tx,
      });

      let sharedLinkedPlayerId: number | null = null;
      if (args.input.type === "shared") {
        const sharedPlayer = await playerRepository.getSharedPlayer(
          {
            id: args.input.sharedPlayerId,
            sharedWithId: args.ctx.userId,
          },
          tx,
        );
        sharedLinkedPlayerId = sharedPlayer?.linkedPlayerId ?? null;
      }

      const sameAsProfile = this.isViewerSameAsProfileTarget(
        args.input,
        userPlayerId,
        sharedLinkedPlayerId,
      );

      const viewerByMatch =
        userPlayerId !== null && summaries.length > 0
          ? await matchRepository.getViewerOutcomesForCanonicalMatches({
              userId: args.ctx.userId,
              viewerPlayerId: userPlayerId,
              canonicalMatchIds: summaries.map((r) => r.matchId),
              tx,
            })
          : new Map();

      const matches: GetPlayerRecentMatchesOutputType["matches"] = [];
      for (const row of summaries) {
        const entry =
          await playerInsightsMatchQueryService.mapMatchEntryFromRow({
            ctx: args.ctx,
            input: {
              matchId: row.matchId,
              sharedMatchId: row.sharedMatchId,
              matchType: row.matchType,
              date: row.date,
              isCoop: row.isCoop,
              gameId: row.gameId,
              sharedGameId: row.sharedGameId,
              gameType: row.gameType,
              gameName: row.gameName,
              gameImage: row.gameImage,
              scoresheetWinCondition: row.scoresheetWinCondition,
              outcomePlacement: row.outcomePlacement,
              outcomeScore: row.outcomeScore,
              outcomeWinner: row.outcomeWinner,
              playerCount: row.playerCount,
            },
          });
        const viewerRow = viewerByMatch.get(row.matchId);
        matches.push({
          ...entry,
          viewerParticipation: {
            inMatch: viewerRow !== undefined,
            outcome:
              viewerRow !== undefined
                ? {
                    placement: viewerRow.placement,
                    score: viewerRow.score,
                    isWinner: viewerRow.winner,
                  }
                : undefined,
            isSameAsProfilePlayer: sameAsProfile && viewerRow !== undefined,
          },
        });
      }
      return {
        player,
        matches,
      };
    });
  }

  public async getPlayerGameWinRateCharts(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerGameWinRateChartsOutputType> {
    return db.transaction(async (tx) => {
      const player = await this.getInsightsTarget(args, tx);
      const repoArgs = {
        userId: args.ctx.userId,
        input: args.input,
        tx,
      };
      const rollup =
        await playerInsightsRepository.getPerformanceRollup(repoArgs);
      const gameAgg =
        await playerInsightsRepository.getFavoriteGamesAggregates(repoArgs);
      const now = new Date();
      const competitiveRolling12 =
        await playerInsightsRepository.getCompetitiveWinRatesLastTwoRollingYears(
          repoArgs,
          now,
        );
      const {
        last12Months: lastWindowOutcomes,
        prior12Months: priorWindowOutcomes,
      } =
        await playerInsightsRepository.getChronologicalCompetitiveMatchOutcomesInRollingWindows(
          repoArgs,
          now,
        );
      const MIN_MATCHES_FOR_RUNNING_WIN_RATE_CHART = 5;
      const oneYearMs = rollingOneYearMs();
      const last12Start = new Date(now.getTime() - oneYearMs);
      const prior12Start = new Date(now.getTime() - 2 * oneYearMs);
      const buildRunningWinRateByWindow = (
        outcomes: typeof lastWindowOutcomes,
      ): RunningWinRatePoint[] => {
        let cumulativeWins = 0;
        const points: RunningWinRatePoint[] = [];
        for (const [i, outcome] of outcomes.entries()) {
          const matchIndex = i + 1;
          if (outcome.isWin) {
            cumulativeWins += 1;
          }
          if (matchIndex < MIN_MATCHES_FOR_RUNNING_WIN_RATE_CHART) {
            continue;
          }
          points.push({
            matchDate: outcome.matchDate,
            matchIndex,
            cumulativeMatches: matchIndex,
            cumulativeWins,
            winRate: cumulativeWins / matchIndex,
          });
        }
        return points;
      };
      const byTime: GetPlayerGameWinRateChartsOutputType["series"]["byTime"] = {
        monthSlotLabels: buildMonthSlotLabelsUtc(last12Start),
        priorMonthSlotLabels: buildMonthSlotLabelsUtc(prior12Start),
        last12Months: collapseRunningPointsByMonthSlot(
          buildRunningWinRateByWindow(lastWindowOutcomes),
          last12Start,
        ),
        prior12Months: collapseRunningPointsByMonthSlot(
          buildRunningWinRateByWindow(priorWindowOutcomes),
          prior12Start,
        ),
      };
      return {
        player,
        series: {
          byGame: gameAgg.map((row) => ({
            gameIdKey:
              row.gameVisibilitySource === "original"
                ? `original-${row.canonicalGameId}`
                : `shared-${row.sharedGameId ?? row.canonicalGameId}`,
            gameName: row.gameName,
            winRate: row.plays > 0 ? row.wins / row.plays : 0,
            matches: row.plays,
          })),
          byMode: [
            {
              mode: "coop" as const,
              matches: rollup.coopMatches,
              winRate:
                rollup.coopMatches > 0
                  ? rollup.coopWins / rollup.coopMatches
                  : 0,
            },
            {
              mode: "competitive" as const,
              matches: rollup.competitiveMatches,
              winRate:
                rollup.competitiveMatches > 0
                  ? rollup.competitiveWins / rollup.competitiveMatches
                  : 0,
            },
          ],
          byTime,
          competitiveRolling12,
        },
      };
    });
  }

  public async getPlayerTopRivals(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerTopRivalsOutputType> {
    const { player, rows } = await db.transaction(async (tx) => {
      const p = await this.getInsightsTarget(args, tx);
      const r = await this.getRows({ ...args, tx });
      return { player: p, rows: r };
    });
    type CompetitiveVsAcc = {
      matches: number;
      placementDeltaSum: number;
      placementDeltaCount: number;
      secondsSum: number;
    };
    const emptyCompetitiveVs = (): CompetitiveVsAcc => ({
      matches: 0,
      placementDeltaSum: 0,
      placementDeltaCount: 0,
      secondsSum: 0,
    });
    const rivals = new Map<
      string,
      {
        opponent: PlayerInsightsIdentityType;
        matches: number;
        winsVs: number;
        lossesVs: number;
        tiesVs: number;
        secondsPlayedTogether: number;
        competitiveVs: CompetitiveVsAcc;
        gameKeys: Set<string>;
        lastPlayedAt: Date | null;
        perGame: Map<
          string,
          {
            matches: number;
            winsVs: number;
            lossesVs: number;
            tiesVs: number;
            gameName: string;
            secondsPlayedTogether: number;
            competitiveVs: CompetitiveVsAcc;
          }
        >;
      }
    >();
    for (const row of rows) {
      const target = this.getTargetParticipant({ row, input: args.input });
      if (!target) {
        continue;
      }
      const gk = this.gameIdentityKey(row);
      for (const participant of row.participants) {
        if (participant.playerId === target.playerId) {
          continue;
        }
        if (target.teamId !== null && participant.teamId === target.teamId) {
          continue;
        }
        const opponent = await this.toIdentity(participant, args.ctx);
        const key =
          opponent.type === "shared"
            ? `shared-${opponent.sharedId}`
            : `original-${opponent.id}`;
        const existing = rivals.get(key);
        const result = this.compareRivalHeadToHead({
          row,
          target,
          other: participant,
        });
        const bumpCompetitive = (acc: CompetitiveVsAcc) => {
          if (row.isCoop) {
            return;
          }
          acc.matches += 1;
          acc.secondsSum += row.duration;
          if (target.placement !== null && participant.placement !== null) {
            acc.placementDeltaSum += participant.placement - target.placement;
            acc.placementDeltaCount += 1;
          }
        };
        if (!existing) {
          const perGame = new Map<
            string,
            {
              matches: number;
              winsVs: number;
              lossesVs: number;
              tiesVs: number;
              gameName: string;
              secondsPlayedTogether: number;
              competitiveVs: CompetitiveVsAcc;
            }
          >();
          const cv = emptyCompetitiveVs();
          bumpCompetitive(cv);
          perGame.set(gk, {
            matches: 1,
            winsVs: result === "win" ? 1 : 0,
            lossesVs: result === "loss" ? 1 : 0,
            tiesVs: result === "tie" ? 1 : 0,
            gameName: row.gameName,
            secondsPlayedTogether: row.duration,
            competitiveVs: cv,
          });
          const topCv = emptyCompetitiveVs();
          bumpCompetitive(topCv);
          rivals.set(key, {
            opponent,
            matches: 1,
            winsVs: result === "win" ? 1 : 0,
            lossesVs: result === "loss" ? 1 : 0,
            tiesVs: result === "tie" ? 1 : 0,
            secondsPlayedTogether: row.duration,
            competitiveVs: topCv,
            gameKeys: new Set([gk]),
            lastPlayedAt: row.date,
            perGame,
          });
          continue;
        }
        existing.matches += 1;
        existing.secondsPlayedTogether += row.duration;
        if (result === "win") existing.winsVs += 1;
        if (result === "loss") existing.lossesVs += 1;
        if (result === "tie") existing.tiesVs += 1;
        bumpCompetitive(existing.competitiveVs);
        const pg = existing.perGame.get(gk);
        if (!pg) {
          const cv = emptyCompetitiveVs();
          bumpCompetitive(cv);
          existing.perGame.set(gk, {
            matches: 1,
            winsVs: result === "win" ? 1 : 0,
            lossesVs: result === "loss" ? 1 : 0,
            tiesVs: result === "tie" ? 1 : 0,
            gameName: row.gameName,
            secondsPlayedTogether: row.duration,
            competitiveVs: cv,
          });
        } else {
          pg.matches += 1;
          pg.secondsPlayedTogether += row.duration;
          if (result === "win") pg.winsVs += 1;
          if (result === "loss") pg.lossesVs += 1;
          if (result === "tie") pg.tiesVs += 1;
          bumpCompetitive(pg.competitiveVs);
        }
        existing.gameKeys.add(gk);
        if (
          existing.lastPlayedAt === null ||
          row.date > existing.lastPlayedAt
        ) {
          existing.lastPlayedAt = row.date;
        }
      }
    }
    return {
      player,
      rivals: Array.from(rivals.values())
        .filter((entry) => entry.matches >= MIN_RIVAL_OR_TEAMMATE_MATCHES)
        .map((entry) => ({
          opponent: entry.opponent,
          matches: entry.matches,
          winsVs: entry.winsVs,
          lossesVs: entry.lossesVs,
          tiesVs: entry.tiesVs,
          winRateVs: entry.matches > 0 ? entry.winsVs / entry.matches : 0,
          recentDelta: entry.winsVs - entry.lossesVs,
          uniqueGamesPlayed: entry.gameKeys.size,
          lastPlayedAt: entry.lastPlayedAt,
          secondsPlayedTogether: entry.secondsPlayedTogether,
          competitiveMatches: entry.competitiveVs.matches,
          secondsPlayedCompetitiveTogether: entry.competitiveVs.secondsSum,
          avgPlacementAdvantage:
            entry.competitiveVs.placementDeltaCount > 0
              ? entry.competitiveVs.placementDeltaSum /
                entry.competitiveVs.placementDeltaCount
              : null,
          byGame: Array.from(entry.perGame.entries())
            .map(([gameIdKey, g]) => ({
              gameIdKey,
              gameName: g.gameName,
              matches: g.matches,
              winsVs: g.winsVs,
              lossesVs: g.lossesVs,
              tiesVs: g.tiesVs,
              winRateVs: g.matches > 0 ? g.winsVs / g.matches : 0,
              secondsPlayedTogether: g.secondsPlayedTogether,
              competitiveMatches: g.competitiveVs.matches,
              secondsPlayedCompetitiveTogether: g.competitiveVs.secondsSum,
              avgPlacementAdvantage:
                g.competitiveVs.placementDeltaCount > 0
                  ? g.competitiveVs.placementDeltaSum /
                    g.competitiveVs.placementDeltaCount
                  : null,
            }))
            .toSorted((a, b) => b.matches - a.matches),
        }))
        .toSorted((a, b) => b.matches - a.matches),
    };
  }

  public async getPlayerTopTeammates(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerTopTeammatesOutputType> {
    const { player, rows } = await db.transaction(async (tx) => {
      const p = await this.getInsightsTarget(args, tx);
      const r = await this.getRows({ ...args, tx });
      return { player: p, rows: r };
    });
    const teammates = new Map<
      string,
      {
        teammate: PlayerInsightsIdentityType;
        matchesTogether: number;
        winsTogether: number;
        nonWinsTogether: number;
        placements: number[];
        gameKeys: Set<string>;
        lastPlayedAt: Date | null;
        perGame: Map<
          string,
          {
            matchesTogether: number;
            winsTogether: number;
            nonWinsTogether: number;
            gameName: string;
          }
        >;
      }
    >();
    for (const row of rows) {
      const target = this.getTargetParticipant({ row, input: args.input });
      if (!target || target.teamId === null) {
        continue;
      }
      const gk = this.gameIdentityKey(row);
      for (const participant of row.participants) {
        if (participant.playerId === target.playerId) {
          continue;
        }
        if (participant.teamId !== target.teamId) {
          continue;
        }
        const teammate = await this.toIdentity(participant, args.ctx);
        const key =
          teammate.type === "shared"
            ? `shared-${teammate.sharedId}`
            : `original-${teammate.id}`;
        const existing = teammates.get(key);
        const bothWon = target.winner === true && participant.winner === true;
        if (!existing) {
          const perGame = new Map<
            string,
            {
              matchesTogether: number;
              winsTogether: number;
              nonWinsTogether: number;
              gameName: string;
            }
          >();
          perGame.set(gk, {
            matchesTogether: 1,
            winsTogether: bothWon ? 1 : 0,
            nonWinsTogether: bothWon ? 0 : 1,
            gameName: row.gameName,
          });
          teammates.set(key, {
            teammate,
            matchesTogether: 1,
            winsTogether: bothWon ? 1 : 0,
            nonWinsTogether: bothWon ? 0 : 1,
            placements:
              target.placement !== null && participant.placement !== null
                ? [(target.placement + participant.placement) / 2]
                : [],
            gameKeys: new Set([gk]),
            lastPlayedAt: row.date,
            perGame,
          });
          continue;
        }
        existing.matchesTogether += 1;
        if (bothWon) {
          existing.winsTogether += 1;
        } else {
          existing.nonWinsTogether += 1;
        }
        const pg = existing.perGame.get(gk);
        if (!pg) {
          existing.perGame.set(gk, {
            matchesTogether: 1,
            winsTogether: bothWon ? 1 : 0,
            nonWinsTogether: bothWon ? 0 : 1,
            gameName: row.gameName,
          });
        } else {
          pg.matchesTogether += 1;
          if (bothWon) {
            pg.winsTogether += 1;
          } else {
            pg.nonWinsTogether += 1;
          }
        }
        if (target.placement !== null && participant.placement !== null) {
          existing.placements.push(
            (target.placement + participant.placement) / 2,
          );
        }
        existing.gameKeys.add(gk);
        if (
          existing.lastPlayedAt === null ||
          row.date > existing.lastPlayedAt
        ) {
          existing.lastPlayedAt = row.date;
        }
      }
    }
    return {
      player,
      teammates: Array.from(teammates.values())
        .filter(
          (entry) => entry.matchesTogether >= MIN_RIVAL_OR_TEAMMATE_MATCHES,
        )
        .map((entry) => ({
          teammate: entry.teammate,
          matchesTogether: entry.matchesTogether,
          winsTogether: entry.winsTogether,
          nonWinsTogether: entry.nonWinsTogether,
          winRateTogether:
            entry.matchesTogether > 0
              ? entry.winsTogether / entry.matchesTogether
              : 0,
          avgTeamPlacement:
            entry.placements.length > 0
              ? entry.placements.reduce((acc, value) => acc + value, 0) /
                entry.placements.length
              : null,
          uniqueGamesPlayed: entry.gameKeys.size,
          lastPlayedAt: entry.lastPlayedAt,
          byGame: Array.from(entry.perGame.entries())
            .map(([gameIdKey, g]) => ({
              gameIdKey,
              gameName: g.gameName,
              matchesTogether: g.matchesTogether,
              winsTogether: g.winsTogether,
              nonWinsTogether: g.nonWinsTogether,
              winRateTogether:
                g.matchesTogether > 0 ? g.winsTogether / g.matchesTogether : 0,
            }))
            .toSorted((a, b) => b.matchesTogether - a.matchesTogether),
        }))
        .toSorted((a, b) => b.matchesTogether - a.matchesTogether),
    };
  }

  public async getPlayerPlayedWithGroups(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerPlayedWithGroupsOutputType> {
    const { player, rows } = await db.transaction(async (tx) => {
      const p = await this.getInsightsTarget(args, tx);
      const r = await this.getRows({ ...args, tx });
      return { player: p, rows: r };
    });
    const profileIdentity = await this.resolveProfileIdentityForGroups(
      args,
      rows,
    );
    return {
      player,
      playedWithGroups: await this.buildPlayedWithGroups({
        rows,
        input: args.input,
        ctx: args.ctx,
        profileIdentity,
      }),
    };
  }

  public async getPlayerStreaks(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerStreaksOutputType> {
    const { player, chronological, recentSummaries } = await db.transaction(
      async (tx) => {
        const p = await this.getInsightsTarget(args, tx);
        const chrono =
          await playerInsightsMatchQueryService.getPlayerInsightMatchSummaries({
            ...args,
            tx,
            order: "asc",
          });
        const recent =
          await playerInsightsMatchQueryService.getPlayerInsightMatchSummaries({
            ...args,
            tx,
            order: "desc",
            limit: 10,
          });
        return {
          player: p,
          chronological: chrono,
          recentSummaries: recent,
        };
      },
    );
    let currentType: "win" | "loss" = "loss";
    let currentCount = 0;
    let longestWin = {
      count: 0,
      rangeStart: null as Date | null,
      rangeEnd: null as Date | null,
    };
    let longestLoss = {
      count: 0,
      rangeStart: null as Date | null,
      rangeEnd: null as Date | null,
    };
    let runStart: Date | null = null;
    for (const row of chronological) {
      const result = this.getOutcomeLabelFromFields({
        outcomeWinner: row.outcomeWinner,
        outcomePlacement: row.outcomePlacement,
        outcomeScore: row.outcomeScore,
      });
      // Ties are neutral: they do not extend or reset win/loss runs (unlike losses).
      if (result === "tie") {
        continue;
      }
      if (currentCount === 0) {
        currentType = result;
        currentCount = 1;
        runStart = row.date;
      } else if (currentType === result) {
        currentCount += 1;
      } else {
        currentType = result;
        currentCount = 1;
        runStart = row.date;
      }
      if (currentType === "win" && currentCount > longestWin.count) {
        longestWin = {
          count: currentCount,
          rangeStart: runStart,
          rangeEnd: row.date,
        };
      }
      if (currentType === "loss" && currentCount > longestLoss.count) {
        longestLoss = {
          count: currentCount,
          rangeStart: runStart,
          rangeEnd: row.date,
        };
      }
    }
    return {
      player,
      streaks: {
        current: {
          type: currentType,
          count: currentCount,
        },
        longestWin,
        longestLoss,
        recent: recentSummaries.map((row) => ({
          date: row.date,
          result: this.getOutcomeLabelFromFields({
            outcomeWinner: row.outcomeWinner,
            outcomePlacement: row.outcomePlacement,
            outcomeScore: row.outcomeScore,
          }),
        })),
      },
    };
  }

  public async getPlayerCountStats(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerCountStatsOutputType> {
    return db.transaction(async (tx) => {
      const player = await this.getInsightsTarget(args, tx);
      const repoArgs = {
        userId: args.ctx.userId,
        input: args.input,
        tx,
      };
      const rows =
        await playerInsightsRepository.getCountStatsByTableSize(repoArgs);
      return {
        player,
        distribution: rows.map((r) => ({
          playerCount: r.playerCount,
          matches: r.matches,
          wins: r.wins,
          winRate: r.matches > 0 ? r.wins / r.matches : 0,
          avgPlacement: r.avgPlacement,
          avgScore: r.avgScore,
        })),
      };
    });
  }

  public async getPlayerPlacementDistribution(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerPlacementDistributionOutputType> {
    const { player, dist } = await db.transaction(async (tx) => {
      const p = await this.getInsightsTarget(args, tx);
      const d = await playerInsightsRepository.getPlacementDistribution({
        userId: args.ctx.userId,
        input: args.input,
        tx,
      });
      return { player: p, dist: d };
    });
    const placementTotal = dist.placements.reduce((acc, p) => acc + p.count, 0);
    const bySizeMap = new Map<number, typeof dist.byGameSize>();
    for (const row of dist.byGameSize) {
      const list = bySizeMap.get(row.playerCount) ?? [];
      list.push(row);
      bySizeMap.set(row.playerCount, list);
    }
    const byGameSize = Array.from(bySizeMap.entries())
      .map(([playerCount, rowsForSize]) => {
        const total = rowsForSize.reduce((s, r) => s + r.count, 0);
        return {
          playerCount,
          placements: rowsForSize
            .map((r) => ({
              placement: r.placement,
              count: r.count,
              percentage: total > 0 ? r.count / total : 0,
            }))
            .toSorted((a, b) => a.placement - b.placement),
        };
      })
      .toSorted((a, b) => a.playerCount - b.playerCount);
    return {
      player,
      placements: dist.placements
        .map((p) => ({
          placement: p.placement,
          count: p.count,
          percentage: placementTotal > 0 ? p.count / placementTotal : 0,
        }))
        .toSorted((a, b) => a.placement - b.placement),
      byGameSize,
    };
  }
}

export const playerInsightsReadService = new PlayerInsightsReadService();
