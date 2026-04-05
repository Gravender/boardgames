import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import { DetailDialog } from "./DetailDialog";
import { matchInputOriginal } from "./scoresheet-test-fixtures";

const mutateMock = vi.fn(
  (_vars: unknown, opts?: { onSuccess?: () => void }) => {
    opts?.onSuccess?.();
  },
);

vi.mock("~/hooks/mutations/match/scoresheet", () => ({
  useUpdateMatchDetailsMutation: () => ({
    updateMatchDetailsMutation: {
      mutate: mutateMock,
      isPending: false,
    },
  }),
}));

describe("DetailDialog", () => {
  it("updates player details on submit", async () => {
    const user = userEvent.setup();
    mutateMock.mockClear();

    renderWithProviders(
      <DetailDialog
        match={matchInputOriginal}
        data={{
          id: 5,
          name: "Alice",
          details: "old note",
          type: "player",
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /old note/i }));

    expect(screen.getByRole("heading", { name: "Alice" })).toBeVisible();

    const detailsField = screen.getByRole("textbox", { name: "Details" });
    await user.clear(detailsField);
    await user.type(detailsField, "  new bio  ");

    await user.click(screen.getByRole("button", { name: "Ok" }));

    expect(mutateMock).toHaveBeenCalledWith(
      {
        type: "player",
        match: matchInputOriginal,
        id: 5,
        details: "new bio",
      },
      expect.any(Object),
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("updates team details on submit", async () => {
    const user = userEvent.setup();
    mutateMock.mockClear();

    renderWithProviders(
      <DetailDialog
        match={matchInputOriginal}
        data={{
          id: 9,
          name: "Bravo",
          details: null,
          type: "team",
        }}
        placeholder="empty"
      />,
    );

    await user.click(screen.getByRole("button", { name: /empty/i }));

    expect(screen.getByRole("heading", { name: "Team: Bravo" })).toBeVisible();

    const detailsField = screen.getByRole("textbox", { name: "Details" });
    await user.type(detailsField, "team notes");

    await user.click(screen.getByRole("button", { name: "Ok" }));

    expect(mutateMock).toHaveBeenCalledWith(
      {
        type: "team",
        match: matchInputOriginal,
        teamId: 9,
        details: "team notes",
      },
      expect.any(Object),
    );
  });

  it("closes on Cancel without calling the mutation", async () => {
    const user = userEvent.setup();
    mutateMock.mockClear();

    renderWithProviders(
      <DetailDialog
        match={matchInputOriginal}
        data={{
          id: 5,
          name: "Alice",
          details: "note",
          type: "player",
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /note/i }));
    expect(screen.getByRole("heading", { name: "Alice" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mutateMock).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Alice" }),
      ).not.toBeInTheDocument();
    });
  });
});
