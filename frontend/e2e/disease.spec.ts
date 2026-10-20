import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import { map, saveSheet, turns } from "./adventure-helpers.js";

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
	await expect(page.getByLabel(/^(Town|Dungeon) map$/)).toBeFocused();
};
const conditions = (page: Page) =>
	page.getByRole("list", { name: "Active player conditions", exact: true });
const health = (page: Page) =>
	page.getByLabel("Player health", { exact: true });
// Document coordinates: mobile focus may scroll the page, but the map must not move or resize.
const mapGeometry = (page: Page) =>
	map(page).evaluate((element) => {
		const box = element.getBoundingClientRect();
		const page = element.ownerDocument.documentElement;
		return {
			top: box.top + page.scrollTop,
			left: box.left + page.scrollLeft,
			width: box.width,
			height: box.height,
		};
	});
const disease = (page: Page) =>
	page.getByRole("button", { name: "Disease — until cured", exact: true });

for (const width of [390, 1440])
	test(`Disease ${width}px: inspect, cure with a potion, save/load and continue identically`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: width === 390 ? 740 : 900 });
		await importAdventure(page, "diseased");
		const frame = await mapGeometry(page);
		await expect(
			conditions(page).getByRole("button", {
				name: "Poison — 5 phases remaining",
			}),
		).toBeVisible();
		await expect(health(page)).toContainText("8 / 8");
		await disease(page).focus();
		await page.keyboard.press("Enter");
		const details = page.getByRole("dialog", { name: /Disease/ });
		await expect(details).toContainText("Maximum HP 10 → 8 (−2).");
		await expect(details).toContainText("sanctuary Cure Disease (150 gold)");
		await page.keyboard.press("Escape");
		await expect(details).toBeHidden();
		await expect(disease(page)).toBeFocused();

		await page.getByRole("button", { name: "Save/Load", exact: true }).click();
		await saveSheet(page)
			.getByRole("button", { name: "Save adventure", exact: true })
			.click();
		await page
			.getByRole("button", { name: "Confirm save", exact: true })
			.click();
		await saveSheet(page)
			.getByRole("button", { name: "Close", exact: true })
			.click();
		await map(page).click();

		const drinkCure = async () => {
			await page.keyboard.press("1");
			await expect(turns(page)).toHaveText("Turn 1");
			await expect(disease(page)).toHaveCount(0);
			// Capacity returns without healing; poison still ticks after monsters.
			await expect(health(page)).toContainText("7 / 10");
			await expect(
				conditions(page).getByRole("button", { name: /^Poison/ }),
			).toBeVisible();
			expect(await mapGeometry(page)).toEqual(frame);
			await expect(map(page)).toBeFocused();
		};
		await drinkCure();
		await page.keyboard.press("1");
		await expect(turns(page)).toHaveText("Turn 1");

		await page.getByRole("button", { name: "Save/Load", exact: true }).click();
		await saveSheet(page)
			.getByRole("button", { name: "Load adventure", exact: true })
			.click();
		await page
			.getByRole("button", { name: "Confirm load", exact: true })
			.click();
		await expect(map(page)).toBeFocused();
		await expect(turns(page)).toHaveText("Turn 0");
		await expect(disease(page)).toBeVisible();
		await expect(health(page)).toContainText("8 / 8");
		await drinkCure();
	});

for (const width of [390, 1440])
	test(`sanctuary ${width}px: cancel, then confirm a Disease cure without healing or a turn`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: width === 390 ? 740 : 900 });
		await importAdventure(page, "town-diseased");
		const townMap = page.getByLabel("Town map", { exact: true });
		await page.keyboard.press("e");
		const sanctuary = page.getByRole("dialog", { name: "Sanctuary" });
		await expect(sanctuary).toContainText("Gold: 400");
		await expect(sanctuary).toContainText("HP 4 / 8");
		await sanctuary
			.getByRole("button", { name: "Cure Disease 150 gold", exact: true })
			.click();
		const confirm = sanctuary.getByRole("group", {
			name: "Confirm sanctuary treatment",
		});
		await expect(confirm).toBeFocused();
		await expect(confirm).toContainText(
			"Restore no HP; maximum HP 10. Remove Disease. Mana is unchanged. 150 gold.",
		);
		await confirm
			.getByRole("button", { name: "Cancel treatment", exact: true })
			.click();
		await expect(sanctuary).toContainText("Gold: 400");
		await expect(sanctuary).toContainText("HP 4 / 8");
		await sanctuary
			.getByRole("button", { name: "Cure Disease 150 gold", exact: true })
			.click();
		await confirm
			.getByRole("button", { name: "Confirm treatment", exact: true })
			.click();
		await expect(sanctuary).toContainText("Gold: 250");
		await expect(sanctuary).toContainText("HP 4 / 10");
		await expect(
			sanctuary.getByRole("button", {
				name: "Cure Disease Not needed",
				exact: true,
			}),
		).toBeDisabled();
		await sanctuary
			.getByRole("button", { name: "Leave sanctuary", exact: true })
			.click();
		await expect(townMap).toBeFocused();
		await expect(disease(page)).toHaveCount(0);
		await expect(
			conditions(page).getByRole("button", {
				name: "Poison — 5 phases remaining",
			}),
		).toBeVisible();
		await expect(turns(page)).toHaveText("Turn 0");
	});

test("Plague Rat loop: contract Disease, read guidance, cure, then save/load and continue identically", async ({
	page,
}) => {
	await importAdventure(page, "plague-bite");
	const start = Number((await turns(page).textContent())?.replace("Turn ", ""));
	await page.keyboard.press("Space");
	await expect(turns(page)).toHaveText(`Turn ${start + 1}`);
	await expect(disease(page)).toBeVisible();
	await expect(health(page)).toContainText("8 / 8");
	await expect(
		page.getByRole("log", { name: "Activity log", exact: true }),
	).toContainText("Disease applied (plague rat)");
	await disease(page).click();
	await expect(page.getByRole("dialog", { name: /Disease/ })).toContainText(
		"Maximum HP 10 → 8 (−2).",
	);
	await page.keyboard.press("Escape");
	await map(page).click();

	await page.getByRole("button", { name: "Save/Load", exact: true }).click();
	await saveSheet(page)
		.getByRole("button", { name: "Save adventure", exact: true })
		.click();
	await page.getByRole("button", { name: "Confirm save", exact: true }).click();
	await saveSheet(page)
		.getByRole("button", { name: "Close", exact: true })
		.click();
	await map(page).click();

	const cure = async () => {
		await page.keyboard.press("1");
		await expect(turns(page)).toHaveText(`Turn ${start + 2}`);
		await expect(disease(page)).toHaveCount(0);
		return health(page).textContent();
	};
	const cured = await cure();
	expect(cured).toContain("/ 10");
	await page.getByRole("button", { name: "Save/Load", exact: true }).click();
	await saveSheet(page)
		.getByRole("button", { name: "Load adventure", exact: true })
		.click();
	await page.getByRole("button", { name: "Confirm load", exact: true }).click();
	await expect(map(page)).toBeFocused();
	await expect(turns(page)).toHaveText(`Turn ${start + 1}`);
	await expect(disease(page)).toBeVisible();
	expect(await cure()).toBe(cured);
});

test("Spider web loop: see the marked tile, get Slowed, read guidance and drink Cleansing", async ({
	page,
}) => {
	await importAdventure(page, "spider-web");
	const frame = await mapGeometry(page);
	await page.keyboard.press("Space");
	const log = page.getByRole("log", { name: "Activity log", exact: true });
	await expect(log).toContainText("readies a web at your tile");
	await page.keyboard.press("Space");
	await expect(log).toContainText("web catches you");
	const slowed = page.getByRole("button", {
		name: "Slowed — 9 phases remaining",
		exact: true,
	});
	await expect(slowed).toBeVisible();
	await slowed.click();
	await expect(page.getByRole("dialog", { name: /Slowed/ })).toContainText(
		"Evade 20% → 10% (−10).",
	);
	await page.keyboard.press("Escape");
	await map(page).click();
	await page.keyboard.press("1");
	await expect(slowed).toHaveCount(0);
	await expect(page.getByRole("button", { name: /^Slowed/ })).toHaveCount(0);
	await expect(log).toContainText("Cleansing potion and remove Slowed");
	expect(await mapGeometry(page)).toEqual(frame);
	await expect(map(page)).toBeFocused();
});

test("Mana leech: a landed hit drains mana and burns; a Cleansing potion cures it", async ({
	page,
}) => {
	await importAdventure(page, "leech-bite");
	const frame = await mapGeometry(page);
	const mana = page.getByLabel("Player mana", { exact: true });
	const before = await mana.textContent();
	await page.keyboard.press("Space");
	const log = page.getByRole("log", { name: "Activity log", exact: true });
	await expect(log).toContainText(/The mana leech drains [234] mana\./);
	await expect(log).toContainText("Mana Burn applied (mana leech)");
	expect(await mana.textContent()).not.toBe(before);
	const burn = page.getByRole("button", {
		name: "Mana Burn — 89 phases remaining",
		exact: true,
	});
	await expect(burn).toBeVisible();
	await burn.click();
	await expect(page.getByRole("dialog", { name: /Mana Burn/ })).toContainText(
		"sanctuary Cure Mana Burn (75 gold)",
	);
	await page.keyboard.press("Escape");
	await map(page).click();
	await page.keyboard.press("1");
	await expect(page.getByRole("button", { name: /^Mana Burn/ })).toHaveCount(0);
	await expect(log).toContainText("Cleansing potion and remove Mana Burn");
	expect(await mapGeometry(page)).toEqual(frame);
});

test("Hexweaver: a telegraphed hex curses; a Remove Curse scroll lifts it", async ({
	page,
}) => {
	await importAdventure(page, "hexweaver-sight");
	const frame = await mapGeometry(page);
	const log = page.getByRole("log", { name: "Activity log", exact: true });
	await page.keyboard.press("Space");
	await expect(log).toContainText("The hexweaver begins a hex.");
	await page.keyboard.press("Space");
	await expect(log).toContainText("The hexweaver's hex strikes you for");
	await expect(log).toContainText("Curse applied (hexweaver)");
	const curse = page.getByRole("button", {
		name: "Curse — until cured",
		exact: true,
	});
	await expect(curse).toBeVisible();
	await curse.click();
	await expect(page.getByRole("dialog", { name: /Curse/ })).toContainText(
		"sanctuary Cure Curse (250 gold)",
	);
	await page.keyboard.press("Escape");
	await map(page).click();
	await page.keyboard.press("i");
	const character = page.getByRole("dialog", {
		name: "The Adventurer's Ledger",
		exact: true,
	});
	await character
		.getByRole("button", { name: "Remove Curse scroll, slot 1", exact: true })
		.click();
	await character
		.getByRole("button", { name: "Read Remove Curse scroll", exact: true })
		.click();
	await expect(page.getByRole("button", { name: /^Curse/ })).toHaveCount(0);
	await expect(log).toContainText(
		"You read Remove Curse scroll and remove Curse.",
	);
	expect(await mapGeometry(page)).toEqual(frame);
});
