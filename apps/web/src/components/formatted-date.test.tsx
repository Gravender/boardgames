import { screen } from "@testing-library/react";
import { format } from "date-fns";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "~/test";

import { FormattedDate } from "./formatted-date";

describe("FormattedDate", () => {
  it("renders date with pattern", () => {
    const date = new Date("2026-06-15T12:00:00.000Z");
    renderWithProviders(<FormattedDate date={date} pattern="yyyy-MM-dd" />);
    expect(screen.getByText(format(date, "yyyy-MM-dd"))).toBeInTheDocument();
  });
});
