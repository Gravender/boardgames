import { describe, expect, it } from "vitest";

import { renderWithProviders } from "~/test";

import { Spinner } from "./spinner";

describe("Spinner", () => {
  it("renders an animated svg", () => {
    const { container } = renderWithProviders(<Spinner aria-label="Loading" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("animate-spin");
    expect(svg).toHaveAttribute("aria-label", "Loading");
  });
});
