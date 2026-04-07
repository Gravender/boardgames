import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import { ShareFormTestHarness } from "./share-test-utils";
import { RolesScoresheetsSubsections } from "../roles-scoresheets-subsections";
import { WhatToShareSection } from "../what-to-share-section";

vi.mock("~/trpc/react", async () => {
  const { getShareGameTrpcReactMock } = await import("./share-trpc-mock");
  return getShareGameTrpcReactMock();
});

describe("RolesScoresheetsSubsections", () => {
  it("shows roles and scoresheets lists when those options are enabled", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ShareFormTestHarness>
        {(ctx) => (
          <>
            <WhatToShareSection />
            <ctx.form.Subscribe
              selector={(s) => ({
                shareRoles: s.values.shareOptions.roles,
                shareScoresheets: s.values.shareOptions.scoresheets,
              })}
            >
              {({ shareRoles, shareScoresheets }) => (
                <RolesScoresheetsSubsections
                  shareRoles={shareRoles}
                  shareScoresheets={shareScoresheets}
                  scoresheetValidationMessages={undefined}
                />
              )}
            </ctx.form.Subscribe>
          </>
        )}
      </ShareFormTestHarness>,
    );

    await user.click(screen.getByRole("checkbox", { name: "Share roles" }));
    await user.click(
      screen.getByRole("checkbox", { name: "Share scoresheets" }),
    );

    expect(screen.getByText("Roles to include")).toBeInTheDocument();

    const scoresheetsSection = document.getElementById(
      "share-section-scoresheets",
    );
    expect(scoresheetsSection).toBeTruthy();
    expect(
      within(scoresheetsSection!).getByText(/Scoresheets to include/i),
    ).toBeInTheDocument();
  });
});
