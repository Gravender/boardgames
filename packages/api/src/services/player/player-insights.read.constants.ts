/** Minimum head-to-head or co-op games together to list someone as a rival or teammate. */
export const MIN_RIVAL_OR_TEAMMATE_MATCHES = 5;

/** Played-with cohorts: at least two opponents; at most five (profile + five = 6). */
export const MIN_COHORT_OPPONENTS = 2;
export const MAX_COHORT_OPPONENTS = 5;
/** Caps combinatorial cohort subset work per match row (opponents × k-combinations). */
export const MAX_COHORT_SUBSETS = 50_000;
/** Aligned with game core detection (often 3+); 1 keeps thin histories visible. */
export const MIN_MATCHES_PER_COHORT_GROUP = 5;
export const MAX_PLAYED_WITH_GROUPS = 300;

export const MS_PER_DAY = 86_400_000;
export const ROLLING_DAYS = 365;

export const rollingOneYearMs = (): number => ROLLING_DAYS * MS_PER_DAY;
