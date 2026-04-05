import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import { MatchImages } from "./match-images";

const deleteMutate = vi.fn();

const matchImagesState = vi.hoisted(() => ({
  data: [] as Array<{
    id: number;
    url: string | null;
    caption: string | null;
    duration: number | null;
  }>,
}));

vi.mock("~/trpc/react", () => ({
  useTRPC: () => ({
    image: {
      getMatchImages: {
        queryOptions: (input: { matchId: number }) => ({
          queryKey: ["image", "getMatchImages", input],
          queryFn: async () => matchImagesState.data,
        }),
      },
    },
  }),
}));

vi.mock("~/hooks/mutations/match/image", () => ({
  useMatchImages: () => ({ data: matchImagesState.data }),
  useDeleteMatchImageMutation: () => ({
    mutate: deleteMutate,
    isPending: false,
  }),
}));

vi.mock("posthog-js/react", () => ({
  usePostHog: () => ({ capture: vi.fn() }),
}));

vi.mock("~/utils/uploadthing", () => ({
  useUploadThing: () => ({
    startUpload: vi.fn(),
  }),
}));

describe("MatchImages", () => {
  beforeEach(() => {
    matchImagesState.data = [];
    deleteMutate.mockClear();
  });

  it("opens the add image dialog from the carousel add tile", async () => {
    const user = userEvent.setup();

    renderWithProviders(<MatchImages matchId={42} duration={120} />);

    await user.click(screen.getByRole("button", { name: /add match image/i }));

    expect(
      screen.getByRole("heading", { name: "Add Match Image" }),
    ).toBeVisible();
    expect(screen.getByLabelText(/Image Caption/i)).toBeInTheDocument();
  });

  it("renders image tiles and can delete a match image", async () => {
    const user = userEvent.setup();
    matchImagesState.data = [
      {
        id: 99,
        url: "https://example.com/x.png",
        caption: "Board setup",
        duration: null,
      },
    ];

    renderWithProviders(<MatchImages matchId={42} duration={120} />);

    expect(screen.getByRole("button", { name: "Board setup" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Board setup" }));

    expect(screen.getByRole("heading", { name: "Full View" })).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: /delete match image/i }),
    );

    expect(
      screen.getByRole("heading", {
        name: /Are you absolutely sure you want to delete this match image/i,
      }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(deleteMutate).toHaveBeenCalledWith({ id: 99 });
  });

  it("does not delete when the user cancels the confirmation", async () => {
    const user = userEvent.setup();
    matchImagesState.data = [
      {
        id: 99,
        url: "https://example.com/x.png",
        caption: "Board setup",
        duration: null,
      },
    ];

    renderWithProviders(<MatchImages matchId={42} duration={120} />);

    await user.click(screen.getByRole("button", { name: "Board setup" }));
    await user.click(
      screen.getByRole("button", { name: /delete match image/i }),
    );

    expect(
      screen.getByRole("heading", {
        name: /Are you absolutely sure you want to delete this match image/i,
      }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(deleteMutate).not.toHaveBeenCalled();
  });
});
