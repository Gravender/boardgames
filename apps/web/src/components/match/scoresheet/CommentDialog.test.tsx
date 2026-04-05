import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import { CommentDialog } from "./CommentDialog";
import { matchInputOriginal } from "./scoresheet-test-fixtures";

const mutateMock = vi.fn(
  (_vars: unknown, opts?: { onSuccess?: () => void }) => {
    opts?.onSuccess?.();
  },
);

vi.mock("~/hooks/mutations/match/scoresheet", () => ({
  useUpdateMatchCommentMutation: () => ({
    updateMatchCommentMutation: {
      mutate: mutateMock,
      isPending: false,
    },
  }),
}));

describe("CommentDialog", () => {
  it("submits trimmed comment via mutation and closes the dialog", async () => {
    const user = userEvent.setup();
    mutateMock.mockClear();

    renderWithProviders(
      <CommentDialog matchInput={matchInputOriginal} comment="old" />,
    );

    await user.click(screen.getByRole("button", { name: /old/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Match Comment" }),
    ).toBeVisible();

    const commentBox = screen.getByRole("textbox", { name: "Comment" });
    await user.clear(commentBox);
    await user.type(commentBox, "  hello world  ");

    await user.click(screen.getByRole("button", { name: "Ok" }));

    expect(mutateMock).toHaveBeenCalledWith(
      {
        match: matchInputOriginal,
        comment: "hello world",
      },
      expect.any(Object),
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("sends null when comment is cleared to whitespace", async () => {
    const user = userEvent.setup();
    mutateMock.mockClear();

    renderWithProviders(
      <CommentDialog matchInput={matchInputOriginal} comment="x" />,
    );

    await user.click(screen.getByRole("button", { name: "x" }));

    const commentBox = screen.getByRole("textbox", { name: "Comment" });
    await user.clear(commentBox);
    await user.type(commentBox, "   ");

    await user.click(screen.getByRole("button", { name: "Ok" }));

    expect(mutateMock).toHaveBeenCalledWith(
      {
        match: matchInputOriginal,
        comment: null,
      },
      expect.any(Object),
    );
  });

  it("closes on Cancel without calling the mutation", async () => {
    const user = userEvent.setup();
    mutateMock.mockClear();

    renderWithProviders(
      <CommentDialog matchInput={matchInputOriginal} comment="draft" />,
    );

    await user.click(screen.getByRole("button", { name: /draft/i }));

    expect(
      screen.getByRole("heading", { name: "Match Comment" }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mutateMock).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Match Comment" }),
      ).not.toBeInTheDocument();
    });
  });
});
