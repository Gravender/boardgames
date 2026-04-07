import { describe, expect, it } from "vitest";

import {
  createInitialFormValues,
  mockMatchIdKey,
  MOCK_GET_GAME_TO_SHARE,
  SHARE_MATCH_LIST,
} from "./share-test-fixtures";
import {
  createShareGameFormSubmitSchema,
  safeParseShareGameFormSubmit,
  shareGameFormValuesSchema,
  shareSubmitIssuesToValidationSections,
} from "../share-game-form-schema";

describe("shareGameFormValuesSchema", () => {
  it("accepts initial mock form values", () => {
    const v = createInitialFormValues();
    expect(shareGameFormValuesSchema.safeParse(v).success).toBe(true);
  });
});

describe("createShareGameFormSubmitSchema", () => {
  it("rejects when there are no recipients", () => {
    const v = createInitialFormValues();
    const r = safeParseShareGameFormSubmit(v, MOCK_GET_GAME_TO_SHARE);
    expect(r.success).toBe(false);
    if (r.success) return;
    const sections = shareSubmitIssuesToValidationSections(r.error.issues);
    expect(sections.recipients).toContain("Add at least one recipient.");
  });

  it("rejects when an included match uses a scoresheet not included", () => {
    const base = createInitialFormValues();
    const m0 = SHARE_MATCH_LIST[0];
    if (!m0) throw new Error("mock matches");
    const matchKey = mockMatchIdKey(m0.id);
    const sid = String(m0.scoresheetId);

    const v = {
      ...base,
      recipients: [{ userId: "u1", permission: "view" as const }],
      shareOptions: { roles: false, scoresheets: true, matches: true },
      matches: {
        ...base.matches,
        [matchKey]: {
          included: true,
          includePlayers: true,
          includeLocation: true,
        },
      },
      scoresheetInclusion: {
        ...base.scoresheetInclusion,
        [sid]: false,
      },
    };

    const r = createShareGameFormSubmitSchema(MOCK_GET_GAME_TO_SHARE).safeParse(
      v,
    );
    expect(r.success).toBe(false);
    if (r.success) return;
    const sections = shareSubmitIssuesToValidationSections(r.error.issues);
    expect(sections.scoresheets.length).toBeGreaterThan(0);
    expect(sections.matches.length).toBeGreaterThan(0);
    expect(sections.scoresheets[0]).toBe(sections.matches[0]);
  });
});
