import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";

const importAdventure = async (page: Page, name: string) => {
	await page.goto("/");
	await page
		.getByRole("button", { name: "Load an existing save", exact: true })
		.click();
	await page
		.getByLabel("Import adventure file")
		.setInputFiles(
			fileURLToPath(new URL(`.generated/${name}.json`, import.meta.url)),
		);
};
for (const width of [390, 1440])
	for (const theme of ["Light", "Dark"]) {
		test(`permanent potion gains ${width}px ${theme}: stack, save and retain without refilling`, async ({
			page,
		}, info) => {
			await page.setViewportSize({ width, height: width === 390 ? 740 : 900 });
			await importAdventure(page, "permanent-potions");
			const map = page.getByLabel("Dungeon map", { exact: true });
			await page.getByRole("button", { name: "Settings", exact: true }).click();
			await page.getByRole("button", { name: theme, exact: true }).click();
			await page.keyboard.press("Escape");
			await expect(map).toBeFocused();
			await page.keyboard.type("112233");
			await expect(page.getByLabel("Turn count", { exact: true })).toHaveText(
				"Turn 6",
			);
			await expect(
				page.getByLabel("Player mana", { exact: true }),
			).toContainText("4 / 12");
			await expect(
				page.getByLabel("Player health", { exact: true }),
			).toContainText("5 / 10");
			await expect(
				page.getByRole("list", {
					name: "Active player conditions",
					exact: true,
				}),
			).toHaveCount(0);
			await page.keyboard.press("c");
			for (const attribute of ["Strength", "Dexterity", "Intelligence"])
				await expect(
					page.getByLabel(`Character ${attribute}`, { exact: true }),
				).toContainText(`${attribute} 12`);
			await expect(
				page.getByLabel("Permanent potion gains", { exact: true }),
			).toHaveText(
				"Permanent potions: Strength +2 · Dexterity +2 · Intelligence +2",
			);
			await page.screenshot({
				path: info.outputPath(`permanent-${width}-${theme}.png`),
			});
			await page.keyboard.press("Escape");
			await page
				.getByRole("button", { name: "Save/Load", exact: true })
				.click();
			await page
				.getByRole("button", { name: "Save adventure", exact: true })
				.click();
			await page
				.getByRole("button", { name: "Confirm save", exact: true })
				.click();
			await page.reload();
			await page
				.getByRole("button", { name: "Load an existing save", exact: true })
				.click();
			await page
				.getByRole("button", { name: "Load adventure", exact: true })
				.click();
			await page
				.getByRole("button", { name: "Confirm load", exact: true })
				.click();
			await expect(map).toBeFocused();
			for (let turn = 0; turn < 7; turn++) await page.keyboard.press("Space");
			await page.keyboard.press("c");
			await expect(
				page.getByLabel("Permanent potion gains", { exact: true }),
			).toContainText("Intelligence +2");
			await expect(
				page.getByLabel("Character Intelligence", { exact: true }),
			).toContainText("12");
			await expect(
				page.getByLabel("Character mana", { exact: true }),
			).toContainText("4 / 12");
		});
	}
test("town stat potions cost 1,500 gold and buying grants a bottle rather than an immediate stat gain", async ({
	page,
}) => {
	await importAdventure(page, "town-permanent-potions");
	await page.keyboard.press("e");
	const store = page.getByRole("dialog", {
		name: "Town potion store",
		exact: true,
	});
	const card = store.getByRole("listitem").filter({
		has: page.getByRole("heading", {
			name: "Potion of Strength",
			exact: true,
		}),
	});
	await expect(card).toContainText("1500 gold · 2 remaining");
	await expect(card).toContainText("Permanently adds 1 Strength");
	await card
		.getByRole("button", { name: "Buy Potion of Strength", exact: true })
		.click();
	await store
		.getByRole("button", { name: "Confirm purchase", exact: true })
		.click();
	await expect(store.getByText("Gold: 3500", { exact: true })).toBeVisible();
	await expect(card).toContainText("1500 gold · 1 remaining");
	await page.keyboard.press("Escape");
	await expect(page.getByLabel("Town map", { exact: true })).toBeFocused();
	await page.keyboard.press("c");
	await expect(
		page.getByLabel("Permanent potion gains", { exact: true }),
	).toContainText("Strength +0");
});
