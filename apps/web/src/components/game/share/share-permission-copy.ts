/**
 * Section-level copy aligned with API checks (`sharedGame`, `sharedGameRole`,
 * `sharedScoresheet`, `sharedMatch`, `sharedMatchPlayer`, `sharedLocation`, etc.).
 * Shown once under each heading — not on every row.
 */
export const PERMISSION_SECTION_INTRO = {
  game: {
    view: "Read the shared game’s metadata (name, image, player counts, playtime, year).",
    edit: "Change game-level fields when the share grants edit; the server checks shared game permission.",
  },
  roles: {
    view: "See role names and descriptions shared with you.",
    edit: 'Update or delete shared roles (game-edit checks shared role permission === "edit"); adding new roles follows owner rules.',
  },
  scoresheets: {
    view: "Open shared scoresheets and read structure, rounds, and scores.",
    edit: 'Change scoresheet layout, rounds, and settings (scoresheet edit checks shared scoresheet permission === "edit").',
  },
  matches: {
    view: "See session date, location link, scoresheet, and outcomes for the shared match.",
    edit: 'Edit session details and location on the shared match (match update checks shared match permission === "edit").',
  },
  locations: {
    view: "See venue names and notes tied to shared sessions.",
    edit: "Change how the shared location appears for sessions you can edit.",
  },
  /** Players in scoresheet list (shared player / scoresheet), not match players. */
  scoresheetPlayers: {
    view: "See that player’s name and stats on shared scoresheets.",
    edit: "Change how that player appears on shared scoresheet rows (or exclude with Not shared).",
  },
  /** Per-row in `shared_match_player` — affects score / round edits for that seat. */
  matchPlayers: {
    view: "See that player’s score, placement, and rounds on the shared match.",
    edit: 'Change scores, rounds, and details for that seat (updates check sharedMatchPlayer.permission === "edit").',
  },
} as const;
