import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import { DetailDialog } from "./DetailDialog";
import { matchInputOriginal } from "./scoresheet-test-fixtures";

const mutateMock = vi.fn(async () => {});

vi.mock("~/hooks/mutations/match/scoresheet", () => ({
  useUpdateMatchDetailsMutation: () => ({
    updateMatchDetailsMutation: {
      mutate: mutateMock,
      mutateAsync: mutateMock,
      isPending: false,
    },
  }),
}));

describe("DetailDialog", () => {
  beforeEach(() => {
    mutateMock.mockClear();
  });

  it("autosaves player details after debounce", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      renderWithProviders(
        <DetailDialog
          match={matchInputOriginal}
          canEdit
          data={{
            id: 5,
            name: "Alice",
            details: "old note",
            type: "player",
          }}
        />,
      );

      await user.click(
        screen.getByRole("button", { name: /edit player alice details/i }),
      );

      const detailsField = screen.getByRole("textbox", { name: "Details" });
      await user.clear(detailsField);
      await user.type(detailsField, "  new bio  ");

      vi.advanceTimersByTime(800);

      await waitFor(() => {
        expect(mutateMock).toHaveBeenCalledWith({
          type: "player",
          match: matchInputOriginal,
          id: 5,
          details: "new bio",
        });
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("flushes team details on Done before debounce", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <DetailDialog
        match={matchInputOriginal}
        canEdit
        data={{
          id: 9,
          name: "Bravo",
          details: null,
          type: "team",
        }}
        placeholder="empty"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /edit team bravo details/i }),
    );

    const detailsField = screen.getByRole("textbox", { name: "Details" });
    await user.type(detailsField, "team notes");

    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(mutateMock).toHaveBeenCalledWith({
      type: "team",
      match: matchInputOriginal,
      teamId: 9,
      details: "team notes",
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("closes on Cancel without saving when edits were not committed", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <DetailDialog
        match={matchInputOriginal}
        canEdit
        data={{
          id: 5,
          name: "Alice",
          details: "note",
          type: "player",
        }}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /edit player alice details/i }),
    );

    const detailsField = screen.getByRole("textbox", { name: "Details" });
    await user.type(detailsField, "x");

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mutateMock).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("does not expose an edit control when canEdit is false", () => {
    renderWithProviders(
      <DetailDialog
        match={matchInputOriginal}
        canEdit={false}
        data={{
          id: 5,
          name: "Alice",
          details: "look only",
          type: "player",
        }}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /edit player alice details/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("look only")).toBeInTheDocument();
  });
});
