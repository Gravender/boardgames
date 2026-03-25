import { differenceInDays, isSameDay, max } from "date-fns";

import type { PlayerImage } from "@board-games/shared";

const NINETY_DAYS = 90;
const HALF_LIFE_IN_DAYS = 30;
const MATCH_FREQUENCY_LIMIT = 30;
const FREQUENCY_DECAY_HALF_LIFE_IN_DAYS = 30;
const RECENCY_WEIGHT_FACTOR = 0.7;
const FREQUENCY_WEIGHT_FACTOR = 0.3;
const SAME_DAY_BONUS = 0.3;

export interface MatchHistory {
  date: Date;
  finished: boolean;
}

export interface PlayerMapBase {
  name: string;
  isUser: boolean;
  image: PlayerImage | null;
  matches: MatchHistory[];
}

export interface SortablePlayer {
  score: number;
  lastPlayedAt: Date | null;
  matches: number;
  name: string;
}

const getMostRecentDate = (dates: Date[]): Date =>
  dates.reduce((latest, date) => max([latest, date]), new Date(0));

const getRecentDates = ({
  dates,
  now,
  maxAgeInDays = NINETY_DAYS,
}: {
  dates: Date[];
  now: Date;
  maxAgeInDays?: number;
}) => dates.filter((date) => differenceInDays(now, date) <= maxAgeInDays);

export const recencyWeight = ({
  date,
  now,
  halfLifeInDays = HALF_LIFE_IN_DAYS,
}: {
  date: Date;
  now: Date;
  halfLifeInDays?: number;
}): number => {
  const daysAgo = differenceInDays(now, date);
  return Math.exp(-Math.log(2) * (daysAgo / halfLifeInDays));
};

export const frequencyWeight = ({
  dates,
  matchFrequencyLimit = MATCH_FREQUENCY_LIMIT,
}: {
  dates: Date[];
  matchFrequencyLimit?: number;
}): number => {
  const count = Math.min(dates.length, matchFrequencyLimit);
  return Math.log1p(count);
};

export const computeScore = ({
  matchDates,
  now,
}: {
  matchDates: Date[];
  now: Date;
}): number => {
  if (matchDates.length === 0) return 0;

  const recentDates = getRecentDates({ dates: matchDates, now });
  if (recentDates.length === 0) return 0;

  const recency = recentDates.reduce(
    (maxScore, date) => Math.max(maxScore, recencyWeight({ date, now })),
    0,
  );

  const frequency = frequencyWeight({ dates: recentDates });
  const lastPlayedAt = getMostRecentDate(recentDates);
  const daysSinceLast = differenceInDays(now, lastPlayedAt);
  const frequencyDecay = Math.exp(
    -Math.log(2) * (daysSinceLast / FREQUENCY_DECAY_HALF_LIFE_IN_DAYS),
  );
  const sameDayBonus = isSameDay(lastPlayedAt, now) ? SAME_DAY_BONUS : 0;

  return (
    recency * RECENCY_WEIGHT_FACTOR +
    frequency * frequencyDecay * FREQUENCY_WEIGHT_FACTOR +
    sameDayBonus
  );
};

export const mapPlayer = ({
  base,
  now,
}: {
  base: PlayerMapBase;
  now: Date;
}) => {
  const finished = base.matches.filter((match) => match.finished);
  if (finished.length === 0) {
    return {
      ...base,
      matches: 0,
      lastPlayedAt: null,
      recency: 0,
      frequency: 0,
      score: 0,
    };
  }

  const finishedDates = finished.map((match) => match.date);
  const lastPlayedAt = getMostRecentDate(finishedDates);
  const recentDates = getRecentDates({ dates: finishedDates, now });

  const recency =
    recentDates.length > 0
      ? recentDates.reduce(
          (best, date) => Math.max(best, recencyWeight({ date, now })),
          0,
        )
      : 0;

  const frequency =
    recentDates.length > 0 ? frequencyWeight({ dates: recentDates }) : 0;

  const score = computeScore({
    matchDates: finishedDates,
    now,
  });

  return {
    name: base.name,
    image: base.image,
    isUser: base.isUser,
    matches: finishedDates.length,
    lastPlayedAt,
    recency,
    frequency,
    score,
  };
};

export const sortPlayersForMatch = <T extends SortablePlayer>(
  players: T[],
): T[] => {
  return [...players].toSorted((a, b) => {
    if (a.score !== b.score) return b.score - a.score;

    if (!a.lastPlayedAt && !b.lastPlayedAt) {
      return 0;
    }

    if (a.lastPlayedAt && b.lastPlayedAt) {
      if (a.lastPlayedAt.getTime() !== b.lastPlayedAt.getTime()) {
        return b.lastPlayedAt.getTime() - a.lastPlayedAt.getTime();
      }
    } else if (!a.lastPlayedAt) {
      return 1;
    } else if (!b.lastPlayedAt) {
      return -1;
    }

    if (a.matches !== b.matches) return b.matches - a.matches;

    return a.name.localeCompare(b.name);
  });
};
