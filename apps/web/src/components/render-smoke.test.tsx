import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@board-games/ui/button";

import { renderWithProviders } from "~/test";

describe("renderWithProviders", () => {
  it("renders with TanStack Query provider", () => {
    renderWithProviders(<Button type="button">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});
