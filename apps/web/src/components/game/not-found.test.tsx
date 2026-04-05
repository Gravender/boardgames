import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "~/test";

import { GameNotFound } from "./not-found";

describe("GameNotFound", () => {
  it("renders default copy and navigation links", () => {
    renderWithProviders(<GameNotFound />);

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Game Not Found" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Return Home/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: /Browse Games/i })).toHaveAttribute(
      "href",
      "/dashboard/games",
    );
    expect(screen.getByText(/GAME_404/)).toBeInTheDocument();
  });

  it("accepts custom title and error code", () => {
    renderWithProviders(<GameNotFound title="Missing" errorCode="GONE" />);
    expect(
      screen.getByRole("heading", { name: "Missing" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/GONE/)).toBeInTheDocument();
  });
});
