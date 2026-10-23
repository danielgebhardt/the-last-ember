import { expect, test } from "@playwright/test";
import { importAdventure, map, turns } from "./adventure-helpers.js";
import { enterDungeonFromTown } from "./town-helpers.js";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});
test("fresh starts, New Dungeon and seed replay restore starter potions without locking their shortcuts", async ({
	page,
}) => {
	await page.getByRole("radio", { name: /Small/ }).locator("..").click();
	await page
		.getByRole("button", { name: "Begin Adventure", exact: true })
		.click();
	await enterDungeonFromTown(page);
	await expect(
		page.getByRole("button", {
			name: "Potion slot 1: Healing potion, 1 carried",
			exact: true,
		}),
	).toBeVisible();
	await expect(
		page.getByRole("button", {
			name: "Potion slot 2: Mana potion, 1 carried",
			exact: true,
		}),
	).toBeVisible();
	await page.keyboard.press("1");
	await page.keyboard.press("2");
	await expect(turns(page)).toHaveText("Turn 0");
	await page.keyboard.press("c");
	const character = page.getByRole("dialog", {
		name: "The Adventurer's Ledger",
		exact: true,
	});
	await character
		.getByRole("button", { name: "Healing potion, slot 1", exact: true })
		.click();
	await character
		.getByRole("button", { name: "Assign to potion slot 4", exact: true })
		.click();
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
	await expect(
		page.getByRole("button", { name: "Potion slot 1: empty", exact: true }),
	).toBeVisible();
	await expect(
		page.getByRole("button", {
			name: "Potion slot 4: Healing potion, 1 carried",
			exact: true,
		}),
	).toBeVisible();
	await page.getByRole("button", { name: "New Dungeon", exact: true }).click();
	await page
		.getByRole("button", { name: "Start new dungeon", exact: true })
		.click();
	await enterDungeonFromTown(page);
	await expect(
		page.getByRole("button", {
			name: "Potion slot 1: Healing potion, 1 carried",
			exact: true,
		}),
	).toBeVisible();
	await expect(
		page.getByRole("button", {
			name: "Potion slot 2: Mana potion, 1 carried",
			exact: true,
		}),
	).toBeVisible();
	await map(page).focus();
	await page.keyboard.press("c");
	await character
		.getByRole("button", { name: "Mana potion, slot 2", exact: true })
		.click();
	await character
		.getByRole("button", { name: "Assign to potion slot 3", exact: true })
		.click();
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Settings", exact: true }).click();
	const settings = page.getByRole("dialog", { name: "Settings", exact: true });
	await settings
		.getByRole("textbox", { name: "Dungeon seed", exact: true })
		.fill("123");
	await settings
		.getByRole("button", { name: "Start from seed", exact: true })
		.click();
	await enterDungeonFromTown(page);
	await expect(map(page)).toBeFocused();
	await expect(turns(page)).toHaveText("Turn 0");
	await expect(
		page.getByRole("button", {
			name: "Potion slot 1: Healing potion, 1 carried",
			exact: true,
		}),
	).toBeVisible();
	await expect(
		page.getByRole("button", {
			name: "Potion slot 2: Mana potion, 1 carried",
			exact: true,
		}),
	).toBeVisible();
	await expect(
		page.getByRole("button", {
			name: "Potion slot 3: Greater healing potion, 0 carried",
			exact: true,
		}),
	).toBeVisible();
	await expect(
		page.getByRole("button", {
			name: "Potion slot 4: Greater mana potion, 0 carried",
			exact: true,
		}),
	).toBeVisible();
});

test("interleaved scroll stacks keep their coordinates and selected actions across three uses", async ({
	page,
}, testInfo) => {
	await importAdventure(page, "stacks");
	await page.keyboard.press("c");
	const character = page.getByRole("dialog", {
		name: "The Adventurer's Ledger",
		exact: true,
	});
	// Bag slots stay measurable while the modal enchanting dialog hides the ledger.
	const scroll = page.getByRole("button", {
		name: "Enchantment scroll, slot 1",
		exact: true,
		includeHidden: true,
	});
	const sword = page.getByRole("button", {
		name: "Iron sword +1, slot 2",
		exact: true,
		includeHidden: true,
	});
	const mana = page.getByRole("button", {
		name: "Mana potion, slot 3",
		exact: true,
		includeHidden: true,
	});
	await page.screenshot({
		path: testInfo.outputPath("stacks-grid-before.png"),
	});
	await scroll.click();
	const scrollBounds = await scroll.boundingBox();
	const swordBounds = await sword.boundingBox();
	const manaBounds = await mana.boundingBox();
	await page.screenshot({ path: testInfo.outputPath("stacks-before.png") });
	await character
		.getByRole("button", { name: "Read enchantment scroll", exact: true })
		.click();
	const enchanting = page.getByRole("dialog", {
		name: "Enchant equipment",
		exact: true,
	});
	for (const bonus of [1, 2, 3]) {
		await enchanting
			.getByRole("button", {
				name: `Enchant Short sword${bonus > 1 ? ` +${bonus - 1}` : ""} to +${bonus}`,
				exact: true,
			})
			.press("Enter");
		await expect(turns(page)).toHaveText(`Turn ${bonus}`);
		if (bonus < 3) {
			await expect(enchanting.getByRole("status")).toHaveText(
				`Short sword is now +${bonus}.`,
			);
			// The bag behind the dialog keeps the stack in place as it shrinks.
			await expect(scroll).toHaveAttribute("aria-pressed", "true");
			expect(await scroll.boundingBox()).toEqual(scrollBounds);
			expect(await sword.boundingBox()).toEqual(swordBounds);
			expect(await mana.boundingBox()).toEqual(manaBounds);
			await page.screenshot({
				path: testInfo.outputPath(`stacks-${3 - bonus}-remaining.png`),
			});
		}
	}
	// The last scroll closes the dialog and returns focus to the bag.
	await expect(enchanting).toBeHidden();
	await expect(
		character.getByRole("heading", { name: "Bag", exact: true }),
	).toBeFocused();
	await expect(scroll).toBeHidden();
	await expect(
		character.getByRole("button", {
			name: "Iron sword +1, slot 1",
			exact: true,
		}),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
});

test("shortcut and Character potion use retain the stack, reject full mana freely, and clear final removal", async ({
	page,
}) => {
	await importAdventure(page, "stacks");
	await page.keyboard.press("1");
	await expect(turns(page)).toHaveText("Turn 1");
	await page.keyboard.press("c");
	const character = page.getByRole("dialog", {
		name: "The Adventurer's Ledger",
		exact: true,
	});
	const mana = character.getByRole("button", {
		name: "Mana potion, slot 3",
		exact: true,
	});
	await expect(mana).toHaveAccessibleDescription(/^2 carried/);
	await mana.click();
	const bounds = await mana.boundingBox();
	await character
		.getByRole("button", { name: "Drink potion", exact: true })
		.press("Enter");
	await expect(turns(page)).toHaveText("Turn 2");
	await expect(mana).toHaveAttribute("aria-pressed", "true");
	expect(await mana.boundingBox()).toEqual(bounds);
	await character
		.getByRole("button", { name: "Drink potion", exact: true })
		.click();
	await expect(character.getByRole("alert")).toHaveText(
		"You are already at full mana.",
	);
	await expect(turns(page)).toHaveText("Turn 2");
	await character
		.getByRole("button", { name: "Drop item", exact: true })
		.click();
	await expect(turns(page)).toHaveText("Turn 3");
	await expect(
		character.getByRole("button", { name: "Drink potion", exact: true }),
	).toBeHidden();
	await expect(
		character.getByRole("button", {
			name: "Tower shield, slot 3",
			exact: true,
		}),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
	await page.keyboard.press("g");
	await expect(turns(page)).toHaveText("Turn 4");
	await page.keyboard.press("c");
	await expect(
		character.getByRole("button", { name: "Mana potion, slot 4", exact: true }),
	).toHaveAttribute("aria-pressed", "false");
	await expect(
		character.getByRole("button", { name: "Drink potion", exact: true }),
	).toBeHidden();
});
