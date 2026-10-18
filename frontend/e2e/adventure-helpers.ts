import { fileURLToPath } from "node:url";
import { expect, type Page } from "@playwright/test";

export const map = (page: Page) =>
	page.getByLabel("Dungeon map", { exact: true });
export const turns = (page: Page) =>
	page.getByLabel("Turn count", { exact: true });
export const saveSheet = (page: Page) =>
	page.getByRole("dialog", { name: "Save/Load", exact: true });
export const importAdventure = async (page: Page, name = "ready") => {
	await page
		.getByRole("button", { name: "Load an existing save", exact: true })
		.click();
	await expect(
		page.getByRole("button", { name: "Save adventure", exact: true }),
	).toBeHidden();
	await expect(
		page.getByRole("button", { name: "Export file", exact: true }),
	).toBeHidden();
	await page
		.getByLabel("Import adventure file")
		.setInputFiles(
			fileURLToPath(new URL(`.generated/${name}.json`, import.meta.url)),
		);
	await expect(
		page.getByRole("dialog", { name: "Load adventure", exact: true }),
	).toBeHidden();
	await expect(map(page)).toBeFocused();
};
