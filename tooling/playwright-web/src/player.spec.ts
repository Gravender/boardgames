import { expect, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";

import { db } from "@board-games/db/client";
import { player, user } from "@board-games/db/schema";

import { getBetterAuthUserId } from "./getUserId";

test.describe("Players Page", () => {
  const PLAYER_NAME = "Player Test";
  const EDITED_PLAYER_NAME = "Edited Player";
  async function deletePlayers(browserName: string) {
    const betterAuthUserId = getBetterAuthUserId(browserName);
    const [returnedUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, betterAuthUserId));
    if (returnedUser) {
      const browserPlayerName = browserName + "_" + PLAYER_NAME;
      const editedBrowserPlayerName = browserName + "_" + EDITED_PLAYER_NAME;
      const returnedPlayers = await db.query.player.findMany({
        where: {
          createdBy: returnedUser.id,
          name: {
            OR: [browserPlayerName, editedBrowserPlayerName],
          },
        },
      });
      if (returnedPlayers.length > 0) {
        await db.delete(player).where(
          inArray(
            player.id,
            returnedPlayers.map((p) => p.id),
          ),
        );
      }
    }
  }
  function playerAriaText(playerName: string) {
    const temp = `
      - listitem:
        - 'link "${playerName} Game: Last Played:"':
          - /url: //dashboard/players/\\d+/stats/
          - heading "${playerName}" [level=2]
        - button "0"
        - button "Open menu"
      `;
    return temp;
  }
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
