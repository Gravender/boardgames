import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import { CommentDialog } from "./CommentDialog";
import { matchInputOriginal } from "./scoresheet-test-fixtures";

const mutateMock = vi.fn(async () => {});

vi.mock("~/hooks/mutations/match/scoresheet", () => ({
  useUpdateMatchCommentMutation: () => ({
    updateMatchCommentMutation: {
      mutate: mutateMock,
      mutateAsync: mutateMock,
      isPending: false,
    },
  }),
}));

vi.mock("~/hooks/match/autosave/use-network-online", () => ({
  useNetworkOnline: () => true,
}));

describe("CommentDialog", () => {
  it("autosaves trimmed comment after debounce", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mutateMock.mockClear();

      renderWithProviders(
        <CommentDialog matchInput={matchInputOriginal} comment="old" canEdit />,
      );

      const commentBox = screen.getByRole("textbox", { name: "Comment" });
      await user.clear(commentBox);
      await user.type(commentBox, "  hello world  ");

      vi.advanceTimersByTime(1500);

      await waitFor(() => {
        expect(mutateMock).toHaveBeenCalledWith({
          match: matchInputOriginal,
          comment: "hello world",
        });
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("sends null when comment is cleared to whitespace after debounce", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mutateMock.mockClear();

      renderWithProviders(
        <CommentDialog matchInput={matchInputOriginal} comment="x" canEdit />,
      );

      const commentBox = screen.getByRole("textbox", { name: "Comment" });
      await user.clear(commentBox);
      await user.type(commentBox, "   ");

      vi.advanceTimersByTime(1500);

      await waitFor(() => {
        expect(mutateMock).toHaveBeenCalledWith({
          match: matchInputOriginal,
          comment: null,
        });
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("saves immediately when Save is pressed before debounce elapses", async () => {
    const user = userEvent.setup();
    mutateMock.mockClear();

    renderWithProviders(
      <CommentDialog matchInput={matchInputOriginal} comment="old" canEdit />,
    );

    const commentBox = screen.getByRole("textbox", { name: "Comment" });
    await user.clear(commentBox);
    await user.type(commentBox, "quick");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mutateMock).toHaveBeenCalledWith({
      match: matchInputOriginal,
      comment: "quick",
    });
  });

  it("does not expose an edit control when canEdit is false", () => {
    renderWithProviders(
      <CommentDialog
        matchInput={matchInputOriginal}
        comment="read only"
        canEdit={false}
      />,
    );

    expect(
      screen.queryByRole("textbox", { name: "Comment" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("read only")).toBeInTheDocument();
  });
});
