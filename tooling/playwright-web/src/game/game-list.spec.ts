import { expect, test } from "@playwright/test";

import { GAME_NAME } from "../shared/test-data";
import { deleteGames, gameAriaText } from "./helpers";

test.describe("Game List", () => {
  test.beforeAll(async ({ browserName }) => {
    await deleteGames(browserName);
  });
  test.afterAll(async ({ browserName }) => {
    await deleteGames(browserName);
  });

  test("Add Game when no games exist", async ({ page, browserName }) => {
    const browserGameName = browserName + "_" + GAME_NAME;
    await page.goto("/dashboard/games");
    await page.getByRole("button", { name: "add game" }).click();
    await page.getByPlaceholder("Game name").fill(browserGameName);
    await expect(
      page.getByLabel("Add Game").getByText("Players"),
    ).not.toBeVisible();
    await expect(
      page.getByLabel("Add Game").getByText("Playtime"),
    ).not.toBeVisible();
    await expect(page.getByText("Year Published")).not.toBeVisible();
    await page.getByRole("button", { name: "More options" }).click();

    await expect(
      page
        .getByLabel("Add Game", { exact: true })
        .getByText("Players", { exact: true }),
    ).toBeVisible();

    await expect(
      page
        .getByLabel("Add Game", { exact: true })
        .getByText("Playtime", { exact: true }),
    ).toBeVisible();
    await page.locator('input[name="game.playersMin"]').fill("1");
    await page.locator('input[name="game.playersMax"]').fill("4");
    await page.locator('input[name="game.playtimeMin"]').fill("15");
    await page.locator('input[name="game.playtimeMax"]').fill("30");
    await page.locator('input[name="game.yearPublished"]').fill("2014");
    await page.getByRole("button", { name: "Create New" }).click();
    await page.getByRole("textbox", { name: "Sheet Name" }).fill("Default");
    await page.locator('button[name="winCondition"]').click();
    await page.getByLabel("Highest Score").getByText("Highest Score").click();
    await page.locator('button[name="roundsScore"]').click();
    await page.getByRole("option", { name: "Aggregate" }).click();
    await page.getByRole("button", { name: "Submit" }).click();
    await page.getByRole("button", { name: "Submit" }).click();
    // Wait for success toast to appear
    await expect(page.getByText(/Game .* created successfully!/i)).toBeVisible({
      timeout: 10000,
    });
    await page.goto("/dashboard/");
    await page.goto("/dashboard/games");
    await page.getByRole("textbox", { name: "Search games..." }).click();
    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(browserGameName);

    const originalGameAriaText = gameAriaText(
      browserGameName,
      2014,
      1,
      4,
      15,
      30,
    );
    await expect(
      page.getByLabel("Games", { exact: true }).getByRole("listitem"),
    ).toMatchAriaSnapshot(originalGameAriaText);
  });
});
