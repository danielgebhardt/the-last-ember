import { expect, test } from "@playwright/test";
import { openCustomAdventure } from "./adventure-helpers";
import { enterDungeonFromTown } from "./town-helpers.js";

test("a waiting perk is chosen from Character → Progression without using a turn", async ({
	page,
}, testInfo) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto("/");
	await page
		.getByRole("button", { name: "Begin Adventure", exact: true })
		.click();
	const settings = await openCustomAdventure(page);
	await settings
		.getByRole("textbox", { name: "Dungeon seed", exact: true })
		.fill("7357");
	await settings
		.getByRole("button", { name: "Start custom adventure", exact: true })
		.click();
	await enterDungeonFromTown(page);
	// The test seed starts at level 10: levels 3, 5, 7 and 9 are waiting.
	await page
		.getByRole("button", { name: /^Character\W+perk available$/ })
		.click();
	const dialog = page.getByRole("dialog", { name: "The Adventurer's Ledger" });
	await dialog
		.getByRole("tab", { name: /^Progression\W+4 perks available$/ })
		.click();
	const choice = dialog.getByRole("group", { name: "Level 3 perk choice" });
	await expect(choice.getByRole("button", { name: /^Choose / })).toHaveCount(3);
	for (const [name, size] of [
		["laptop", { width: 1470, height: 830 }],
		["ipad", { width: 1024, height: 768 }],
		["large", { width: 1920, height: 1080 }],
	] as const) {
		await page.setViewportSize(size);
		await expect(choice).toBeInViewport();
		await page.screenshot({
			path: testInfo.outputPath(`progression-${name}.png`),
		});
	}
	await dialog.getByRole("tab", { name: "Character", exact: true }).click();
	await page.screenshot({ path: testInfo.outputPath("character-ipad.png") });
	await page.setViewportSize({ width: 1470, height: 830 });
	await page.screenshot({ path: testInfo.outputPath("character-laptop.png") });
	await dialog.getByRole("tab", { name: /^Progression/ }).click();
	const turn = await page.getByLabel("Turn count").textContent();
	const first = choice.getByRole("button", { name: /^Choose / }).first();
	const perk = (await first.textContent())?.replace("Choose ", "") ?? "";
	await first.click();
	await expect(
		dialog.getByRole("group", { name: "Level 5 perk choice" }),
	).toBeVisible();
	await expect(dialog.getByLabel("Chosen perks")).toContainText(
		`Level 3 · ${perk}:`,
	);
	await expect(
		dialog.getByRole("tab", { name: /^Progression\W+3 perks available$/ }),
	).toBeVisible();
	await expect(page.getByLabel("Turn count")).toHaveText(turn ?? "");
	expect(errors).toEqual([]);
});
