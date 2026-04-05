import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "~/test";

import { MatchNotFound } from "./MatchNotFound";

describe("MatchNotFound", () => {
  it("renders default copy and navigation links", () => {
    renderWithProviders(<MatchNotFound />);

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Match Not Found" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Return Home/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: /Browse Games/i })).toHaveAttribute(
      "href",
      "/dashboard/games",
    );
    expect(screen.getByText(/MATCH_404/)).toBeInTheDocument();
  });

  it("accepts custom title and error code", () => {
    renderWithProviders(<MatchNotFound title="Gone" errorCode="CUSTOM" />);
    expect(screen.getByRole("heading", { name: "Gone" })).toBeInTheDocument();
    expect(screen.getByText(/CUSTOM/)).toBeInTheDocument();
  });
});
