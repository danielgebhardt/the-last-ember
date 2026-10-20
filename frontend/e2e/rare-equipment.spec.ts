import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { turns } from "./adventure-helpers.js";

for (const [fixture, name, other, slot, width] of [
	["rare-cloak", "Warding Cloak", "Spellguard Shield", "chest", 390],
	["rare-shield", "Spellguard Shield", "Warding Cloak", "off hand", 1280],
] as const) {
	test(`${name}: compare, cancel, buy, equip and retain finite ownership at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: width === 390 ? 740 : 900 });
		await page.goto("/");
		await page
			.getByRole("button", { name: "Load an existing save", exact: true })
			.click();
		await page
			.getByLabel("Import adventure file")
			.setInputFiles(
				fileURLToPath(new URL(`.generated/${fixture}.json`, import.meta.url)),
			);
		const map = page.getByLabel("Town map", { exact: true });
		await expect(map).toBeFocused();
		await page.keyboard.press("e");
		const shop = page.getByRole("dialog", {
			name: "Town armor store",
			exact: true,
		});
		await expect(shop).toBeVisible();
		// Armor is grouped by slot: each rare item lives on its own tab.
		const tabFor = (item: string) =>
			shop.getByRole("tab", {
				name: item === "Warding Cloak" ? "Body armor" : "Shields",
				exact: true,
			});
		await tabFor(other).click();
		await expect(
			shop.getByRole("heading", { name: other, exact: true }),
		).toBeVisible();
		await tabFor(name).click();
		const card = shop
			.getByRole("listitem")
			.filter({ has: page.getByRole("heading", { name, exact: true }) });
		await card.scrollIntoViewIfNeeded();
		await expect(card).toContainText("900 gold");
		await expect(card).toContainText("Tradeoff");
		await expect(
			card.getByLabel("Equipment comparison", { exact: true }),
		).toContainText("5% → 15%");
		const buy = card.getByRole("button", { name: new RegExp(`^Buy ${name}`) });
		await buy.click();
		await shop
			.getByRole("button", { name: "Cancel purchase", exact: true })
			.click();
		await expect(shop).toContainText("Gold: 1200");
		await expect(turns(page)).toHaveText("Turn 0");
		await buy.click();
		await shop
			.getByRole("button", { name: "Confirm purchase", exact: true })
			.click();
		await expect(shop).toContainText("Gold: 300");
		await expect(buy).toBeDisabled();
		expect(await shop.evaluate((n) => n.scrollWidth <= n.clientWidth)).toBe(
			true,
		);
		await card
			.getByRole("heading", { name, exact: true })
			.scrollIntoViewIfNeeded();
		await page.screenshot({ path: info.outputPath(`${fixture}-store.png`) });
		await page.keyboard.press("Escape");
		await expect(map).toBeFocused();
		await page.keyboard.press("c");
		const character = page.getByRole("dialog", {
			name: "The Adventurer's Ledger",
			exact: true,
		});
		await character
			.getByRole("button", { name: new RegExp(`^${name}, slot`) })
			.click();
		const details = character.getByRole("region", { name: "Item details" });
		await expect(details).toContainText(
			"Magic resistance +10 percentage points",
		);
		await page.keyboard.press("Escape");
		await expect(map).toBeFocused();
		await page.keyboard.press("e");
		await expect(shop).toBeVisible();
		await tabFor(name).click();
		await expect(buy).toBeDisabled();
		await page.keyboard.press("Escape");
		await expect(map).toBeFocused();
		// Equipment remains a normal dungeon action; town only previews and purchases.
		await page.keyboard.type("wdddddsssssss");
		await page.keyboard.press("Enter");
		const dungeon = page.getByLabel("Dungeon map", { exact: true });
		await expect(dungeon).toBeFocused();
		const height = (await dungeon.boundingBox())?.height;
		await page.keyboard.press("i");
		await character
			.getByRole("button", { name: new RegExp(`^${name}, slot`) })
			.click();
		await details
			.getByRole("button", { name: `Equip on ${slot}`, exact: true })
			.click();
		await expect(
			character.getByLabel("Character magic resistance", { exact: true }),
		).toContainText("15%");
		await expect(turns(page)).toHaveText("Turn 1");
		await page.screenshot({
			path: info.outputPath(`${fixture}-character.png`),
		});
		await page.keyboard.press("Escape");
		await expect(dungeon).toBeFocused();
		expect((await dungeon.boundingBox())?.height).toBe(height);
	});
}
