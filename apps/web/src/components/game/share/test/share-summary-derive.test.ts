import { describe, expect, it } from "vitest";

import {
  createDefaultAdvancedUser,
  createInitialFormValues,
  mockMatchIdKey,
  MOCK_GET_GAME_TO_SHARE,
  SHARE_MATCH_LIST,
} from "./share-test-fixtures";
import { deriveMatchPlayerWithoutPlayerWarning } from "../share-summary-derive";
import type { ShareGameFormValues } from "../types";

describe("deriveMatchPlayerWithoutPlayerWarning", () => {
  it("is false when not advanced", () => {
    const v = createInitialFormValues();
    expect(
      deriveMatchPlayerWithoutPlayerWarning(v, MOCK_GET_GAME_TO_SHARE),
    ).toBe(false);
  });

  it("is true when a match seat is shared but scoresheet player is not", () => {
    const base = createInitialFormValues();
    const m0 = SHARE_MATCH_LIST[0];
    if (!m0) throw new Error("mock matches");
    const matchKey = mockMatchIdKey(m0.id);
    const firstPid = String(m0.players[0]?.playerId);
    if (!firstPid) throw new Error("mock players");

    const adv = createDefaultAdvancedUser("view");
    const scoresheetPlayerPermissions = { ...adv.scoresheetPlayerPermissions };
    delete scoresheetPlayerPermissions[firstPid];

    const values: ShareGameFormValues = {
      ...base,
      sharingMode: "advanced",
      shareOptions: { roles: false, scoresheets: true, matches: true },
      matches: {
        ...base.matches,
        [matchKey]: {
          included: true,
          includePlayers: true,
          includeLocation: true,
        },
      },
      recipients: [{ userId: "friend-u1", permission: "view" }],
      advancedPerUser: {
        "friend-u1": {
          ...adv,
          scoresheetPlayerPermissions,
        },
      },
    };

    expect(
      deriveMatchPlayerWithoutPlayerWarning(values, MOCK_GET_GAME_TO_SHARE),
    ).toBe(true);
  });

  it("is false when scoresheet player is shared with view", () => {
    const base = createInitialFormValues();
    const m0 = SHARE_MATCH_LIST[0];
    if (!m0) throw new Error("mock matches");
    const matchKey = mockMatchIdKey(m0.id);
    const firstPid = String(m0.players[0]?.playerId);
    if (!firstPid) throw new Error("mock players");

    const adv = createDefaultAdvancedUser("view");

    const values: ShareGameFormValues = {
      ...base,
      sharingMode: "advanced",
      shareOptions: { roles: false, scoresheets: true, matches: true },
      matches: {
        ...base.matches,
        [matchKey]: {
          included: true,
          includePlayers: true,
          includeLocation: true,
        },
      },
      recipients: [{ userId: "friend-u1", permission: "view" }],
      advancedPerUser: {
        "friend-u1": adv,
      },
    };

    expect(
      values.advancedPerUser["friend-u1"]?.scoresheetPlayerPermissions[
        firstPid
      ],
    ).toBe("view");
    expect(
      deriveMatchPlayerWithoutPlayerWarning(values, MOCK_GET_GAME_TO_SHARE),
    ).toBe(false);
  });
});
