import type { ShareGameFormValues } from "../types";

type ShareFormState = { values: ShareGameFormValues };

/** Scoresheet inclusion, match rows, and share flag — badge + list. */
export const selectShareMatchesBadgeAndListSlice = (state: ShareFormState) => ({
  scoresheetInclusion: state.values.scoresheetInclusion,
  matchesSnapshot: state.values.matches,
  shareScoresheets: state.values.shareOptions.scoresheets,
});

/** Inclusion + matches only — toolbar visible rows and bulk actions. */
export const selectShareMatchesToolbarSlice = (state: ShareFormState) => ({
  scoresheetInclusion: state.values.scoresheetInclusion,
  matchesSnapshot: state.values.matches,
});
