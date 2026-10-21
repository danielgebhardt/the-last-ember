import { expect, test } from "@playwright/test";
import { map } from "./adventure-helpers.js";
import { enterDungeonFromTown } from "./town-helpers.js";

test("the reserved test seed starts the full kit on the authored encounter floor and cannot be saved", async ({
	page,
}, testInfo) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto("/");
	await page
		.getByRole("button", { name: "Begin Adventure", exact: true })
		.click();
	await page.getByRole("button", { name: "Settings", exact: true }).click();
	const settings = page.getByRole("dialog", { name: "Settings", exact: true });
	await settings
		.getByRole("textbox", { name: "Dungeon seed", exact: true })
		.fill("7357");
	await settings
		.getByRole("button", { name: "Start from seed", exact: true })
		.click();
	await expect(page.getByRole("status", { name: "Player gold" })).toHaveText(
		"Gold 10000",
	);
	await enterDungeonFromTown(page);
	await expect(
		page.getByRole("heading", { name: /^Floor 1 of / }),
	).toBeVisible();
	await expect(
		page.getByRole("button", {
			name: "Potion slot 1: Greater healing potion, 20 carried",
			exact: true,
		}),
	).toBeVisible();
	// Floor 1's start room opens onto the encounter corridor.
	await expect(
		map(page).getByRole("cell", { name: / - player$/ }),
	).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath("floor-1.png") });

	await page.getByRole("button", { name: "Save/Load", exact: true }).click();
	const sheet = page.getByRole("dialog", { name: "Load adventure" });
	await expect(sheet).toContainText("saving is disabled");
	await expect(
		sheet.getByRole("button", { name: "Save adventure" }),
	).toHaveCount(0);
	expect(errors).toEqual([]);
});
