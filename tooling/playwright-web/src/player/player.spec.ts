import { expect, test } from "@playwright/test";

import { EDITED_PLAYER_NAME, PLAYER_NAME } from "../shared/test-data";
import { deletePlayers, playerAriaText } from "./helpers";

test.describe("Players Page", () => {
  test.beforeAll(async ({ browserName }) => {
    await deletePlayers(browserName);
  });
  test.afterAll(async ({ browserName }) => {
    await deletePlayers(browserName);
  });

  test("Add Player", async ({ page, browserName }) => {
    const browserPlayerName = browserName + "_" + PLAYER_NAME;
    await page.goto("/dashboard/players");
    await page.getByRole("button", { name: "add player" }).click();
    await page
      .getByRole("textbox", { name: "Player Name" })
      .fill(browserPlayerName);
    await page.getByRole("button", { name: "Submit" }).click();
    await page.getByRole("textbox", { name: "Search players..." }).click();
    await page
      .getByRole("textbox", { name: "Search players..." })
      .fill(browserPlayerName);
    const ariaText = playerAriaText(browserPlayerName);
    await expect(
      page.getByLabel("Players").getByRole("listitem"),
    ).toMatchAriaSnapshot(ariaText);
  });

  test("Edit Player", async ({ page, browserName }) => {
    const browserPlayerName = browserName + "_" + PLAYER_NAME;
    const editedBrowserPlayerName = browserName + "_" + EDITED_PLAYER_NAME;
    await page.goto("/dashboard/players");
    await page.getByRole("textbox", { name: "Search players..." }).click();
    await page
      .getByRole("textbox", { name: "Search players..." })
      .fill(browserPlayerName);
    const originalPlayerAriaText = playerAriaText(browserPlayerName);
    await expect(
      page.getByLabel("Players").getByRole("listitem"),
    ).toMatchAriaSnapshot(originalPlayerAriaText);
    await page.getByRole("button", { name: "Open menu" }).first().click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    await page
      .getByRole("textbox", { name: "Player Name" })
      .fill(editedBrowserPlayerName);
    await page.getByRole("button", { name: "Submit" }).click();
    await page.getByRole("textbox", { name: "Search players..." }).click();
    await page
      .getByRole("textbox", { name: "Search players..." })
      .fill(editedBrowserPlayerName);
    const editedPlayerAriaText = playerAriaText(editedBrowserPlayerName);
    await expect(
      page.getByLabel("Players").getByRole("listitem"),
    ).toMatchAriaSnapshot(editedPlayerAriaText);
  });
});
