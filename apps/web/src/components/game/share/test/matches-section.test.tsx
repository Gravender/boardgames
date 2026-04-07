import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import { ShareFormTestHarness } from "./share-test-utils";
import { MatchesSection } from "../matches/matches-section";
import { RolesScoresheetsSubsections } from "../roles-scoresheets-subsections";
import { WhatToShareSection } from "../what-to-share-section";

vi.mock("~/trpc/react", async () => {
  const { getShareGameTrpcReactMock } = await import("./share-trpc-mock");
  return getShareGameTrpcReactMock();
});

describe("MatchesSection", () => {
  it("appears after enabling Share matches and lists mock matches", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ShareFormTestHarness>
        {(ctx) => (
          <>
            <WhatToShareSection />
            <ctx.form.Subscribe selector={(s) => s.values.shareOptions.matches}>
              {(shareMatches) =>
                shareMatches ? (
                  <MatchesSection
                    sharingMode="basic"
                    validationMessages={undefined}
                  />
                ) : null
              }
            </ctx.form.Subscribe>
          </>
        )}
      </ShareFormTestHarness>,
    );

    await user.click(screen.getByRole("checkbox", { name: "Share matches" }));

    const section = document.getElementById("share-section-matches");
    expect(section).toBeTruthy();
    expect(within(section!).getByText(/Matches/i)).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /Weekend league/i }),
    ).toBeInTheDocument();
  });

  it("keeps the not-sharing-sheet badge in sync when scoresheets toggles change", async () => {
    const user = userEvent.setup();
    const notSharingBtn = () =>
      screen.queryByRole("button", {
        name: /listed sessions use a scoresheet not marked for sharing/i,
      });

    renderWithProviders(
      <ShareFormTestHarness>
        {(ctx) => (
          <>
            <WhatToShareSection />
            <ctx.form.Subscribe
              selector={(s) => ({
                shareMatches: s.values.shareOptions.matches,
                shareScoresheets: s.values.shareOptions.scoresheets,
              })}
            >
              {({ shareMatches, shareScoresheets }) => (
                <>
                  <RolesScoresheetsSubsections
                    shareRoles={false}
                    shareScoresheets={shareScoresheets}
                    scoresheetValidationMessages={undefined}
                  />
                  {shareMatches ? (
                    <MatchesSection
                      sharingMode="basic"
                      validationMessages={undefined}
                    />
                  ) : null}
                </>
              )}
            </ctx.form.Subscribe>
          </>
        )}
      </ShareFormTestHarness>,
    );

    await user.click(
      screen.getByRole("checkbox", { name: "Share scoresheets" }),
    );
    await user.click(screen.getByRole("checkbox", { name: "Share matches" }));

    expect(notSharingBtn()).not.toBeInTheDocument();

    const standardSheet = screen.getByRole("checkbox", {
      name: /Standard competitive/i,
    });
    await user.click(standardSheet);
    expect(notSharingBtn()).toBeInTheDocument();

    await user.click(standardSheet);
    expect(notSharingBtn()).not.toBeInTheDocument();
  });

  it("clears the not-sharing-sheet badge when a match is selected (effective scoresheet share)", async () => {
    const user = userEvent.setup();
    const notSharingBtn = () =>
      screen.queryByRole("button", {
        name: /listed sessions use a scoresheet not marked for sharing/i,
      });

    renderWithProviders(
      <ShareFormTestHarness>
        {(ctx) => (
          <>
            <WhatToShareSection />
            <ctx.form.Subscribe
              selector={(s) => ({
                shareMatches: s.values.shareOptions.matches,
                shareScoresheets: s.values.shareOptions.scoresheets,
              })}
            >
              {({ shareMatches, shareScoresheets }) => (
                <>
                  <RolesScoresheetsSubsections
                    shareRoles={false}
                    shareScoresheets={shareScoresheets}
                    scoresheetValidationMessages={undefined}
                  />
                  {shareMatches ? (
                    <MatchesSection
                      sharingMode="basic"
                      validationMessages={undefined}
                    />
                  ) : null}
                </>
              )}
            </ctx.form.Subscribe>
          </>
        )}
      </ShareFormTestHarness>,
    );

    await user.click(
      screen.getByRole("checkbox", { name: "Share scoresheets" }),
    );
    await user.click(screen.getByRole("checkbox", { name: "Share matches" }));

    await user.click(
      screen.getByRole("checkbox", { name: /Standard competitive/i }),
    );
    expect(notSharingBtn()).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /Weekend league/i }));
    expect(notSharingBtn()).not.toBeInTheDocument();
  });

  it("keeps the not-sharing-sheet badge when search hides those rows from the list", async () => {
    const user = userEvent.setup();
    const notSharingBtn = () =>
      screen.queryByRole("button", {
        name: /listed sessions use a scoresheet not marked for sharing/i,
      });

    renderWithProviders(
      <ShareFormTestHarness>
        {(ctx) => (
          <>
            <WhatToShareSection />
            <ctx.form.Subscribe
              selector={(s) => ({
                shareMatches: s.values.shareOptions.matches,
                shareScoresheets: s.values.shareOptions.scoresheets,
              })}
            >
              {({ shareMatches, shareScoresheets }) => (
                <>
                  <RolesScoresheetsSubsections
                    shareRoles={false}
                    shareScoresheets={shareScoresheets}
                    scoresheetValidationMessages={undefined}
                  />
                  {shareMatches ? (
                    <MatchesSection
                      sharingMode="basic"
                      validationMessages={undefined}
                    />
                  ) : null}
                </>
              )}
            </ctx.form.Subscribe>
          </>
        )}
      </ShareFormTestHarness>,
    );

    await user.click(
      screen.getByRole("checkbox", { name: "Share scoresheets" }),
    );
    await user.click(screen.getByRole("checkbox", { name: "Share matches" }));

    await user.click(
      screen.getByRole("checkbox", { name: /Standard competitive/i }),
    );
    expect(notSharingBtn()).toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: "Search matches" }),
      "zzzznomatch",
    );
    expect(
      screen.getByText(/No sessions match your search or filters/i),
    ).toBeInTheDocument();
    expect(notSharingBtn()).toBeInTheDocument();
  });
});
