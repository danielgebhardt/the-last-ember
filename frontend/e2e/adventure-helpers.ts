import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, type Page } from "@playwright/test";

// The signed-out browser save slot.
const LOCAL_SAVE_KEY = "larn:adventure-save";

export const map = (page: Page) =>
	page.getByLabel("Dungeon map", { exact: true });
export const turns = (page: Page) =>
	page.getByLabel("Turn count", { exact: true });
export const saveSheet = (page: Page) =>
	page.getByRole("dialog", { name: "Save/Load", exact: true });
// Puts a generated fixture in the browser save, runs `load`, then puts the slot back as it
// was so tests keep starting with an empty browser save.
const withFixtureInSlot = async (
	page: Page,
	name: string,
	load: () => Promise<void>,
) => {
	const text = await readFile(
		fileURLToPath(new URL(`.generated/${name}.json`, import.meta.url)),
		"utf8",
	);
	const previous = await page.evaluate(
		([key, save]) => {
			const before = localStorage.getItem(key);
			localStorage.setItem(key, save);
			return before;
		},
		[LOCAL_SAVE_KEY, text] as const,
	);
	await load();
	await page.evaluate(
		([key, before]) => {
			if (before === null) localStorage.removeItem(key);
			else localStorage.setItem(key, before);
		},
		[LOCAL_SAVE_KEY, previous] as const,
	);
	// Town saves focus the town map; dungeon saves the dungeon map.
	await expect(page.getByLabel(/^(Town|Dungeon) map$/)).toBeFocused();
};
const loadFromSheet = async (page: Page, sheetName: string) => {
	const sheet = page.getByRole("dialog", { name: sheetName, exact: true });
	await sheet
		.getByRole("button", { name: "Load adventure", exact: true })
		.click();
	await page.getByRole("button", { name: "Confirm load", exact: true }).click();
	await expect(sheet).toBeHidden();
};

// Resumes a fixture from the opening's Load an existing save, the way a player would.
export const importAdventure = (page: Page, name = "ready") =>
	withFixtureInSlot(page, name, async () => {
		await page
			.getByRole("button", { name: "Load an existing save", exact: true })
			.click();
		await expect(
			page.getByRole("button", { name: "Save adventure", exact: true }),
		).toBeHidden();
		await loadFromSheet(page, "Load adventure");
	});

// Replaces the adventure in play with a fixture through the Save/Load sheet.
export const reloadAdventure = (page: Page, name: string) =>
	withFixtureInSlot(page, name, async () => {
		await page.getByRole("button", { name: "Save/Load", exact: true }).click();
		await loadFromSheet(page, "Save/Load");
	});
