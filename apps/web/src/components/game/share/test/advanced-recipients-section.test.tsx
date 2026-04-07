import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import { AdvancedRecipientsSection } from "../advanced-recipients-section";
import { RecipientsSection } from "../recipients-section";
import { ShareFormTestHarness } from "./share-test-utils";
import { WhatToShareSection } from "../what-to-share-section";
import { handleSharingModeChange } from "../use-share-game-form";

vi.mock("~/trpc/react", async () => {
  const { getShareGameTrpcReactMock } = await import("./share-trpc-mock");
  return getShareGameTrpcReactMock();
});

describe("AdvancedRecipientsSection", () => {
  it("renders advanced controls after adding a recipient and switching to advanced mode", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ShareFormTestHarness>
        {(ctx) => (
          <>
            <RecipientsSection
              sharingMode="basic"
              friends={ctx.friends}
              validationMessages={undefined}
            />
            <button
              type="button"
              onClick={() =>
                handleSharingModeChange(
                  ctx.form,
                  "advanced",
                  ctx.gameData,
                  ctx.friends,
                )
              }
            >
              Test: switch to advanced
            </button>
            <WhatToShareSection />
            <ctx.form.Subscribe
              selector={(s) => ({
                mode: s.values.sharingMode,
                recipients: s.values.recipients,
              })}
            >
              {({ mode, recipients }) =>
                mode === "advanced" && recipients.length > 0 ? (
                  <AdvancedRecipientsSection friends={ctx.friends} />
                ) : null
              }
            </ctx.form.Subscribe>
          </>
        )}
      </ShareFormTestHarness>,
    );

    await user.click(screen.getByRole("combobox", { name: "User search" }));
    await user.click(screen.getByRole("option", { name: "Alex Chen" }));

    await user.click(
      screen.getByRole("checkbox", { name: "Share scoresheets" }),
    );

    await user.click(
      screen.getByRole("button", { name: "Test: switch to advanced" }),
    );

    expect(
      screen.getByRole("switch", { name: "Show permissions" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/appear on your scoresheets/i)).toBeInTheDocument();
  });
});
