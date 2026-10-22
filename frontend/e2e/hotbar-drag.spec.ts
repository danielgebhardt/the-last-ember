import { expect, type Locator, type Page, test } from "@playwright/test";
import { importAdventure, turns } from "./adventure-helpers.js";
import { mouseDrag } from "./drag-helpers.js";

test.use({ viewport: { width: 1470, height: 830 } });

const openCharacter = async (page: Page) => {
	await page.getByRole("button", { name: "Character", exact: true }).click();
	const dialog = page.getByRole("dialog", {
		name: "The Adventurer's Ledger",
		exact: true,
	});
	await expect(dialog).toBeVisible();
	return dialog;
};
const bagItem = (dialog: Locator, name: string) =>
	dialog
		.getByRole("list", { name: "Carried items" })
		.getByRole("button", { name: new RegExp(`^${name}, slot`) });
const potionSlot = (dialog: Locator, slot: number) =>
	dialog.getByLabel(`Potion slot ${slot} assignment`);
const filledPotionSlot = (dialog: Locator, slot: number) =>
	dialog.getByRole("button", { name: new RegExp(`^Potion slot ${slot}: `) });

test("dragging a potion stack assigns, moves and clears potion shortcuts for free", async ({
	page,
}) => {
	await page.goto("/");
	await importAdventure(page, "drag-gear");
	const dialog = await openCharacter(page);
	await mouseDrag(
		page,
		bagItem(dialog, "Healing potion"),
		potionSlot(dialog, 1),
	);
	await expect(potionSlot(dialog, 1)).toHaveText(
		"Healing potion · Slot 1 · 2 carried",
	);
	// Onto another slot moves the assignment.
	await mouseDrag(page, filledPotionSlot(dialog, 1), potionSlot(dialog, 3));
	await expect(potionSlot(dialog, 1)).toHaveText("Empty · Slot 1");
	await expect(potionSlot(dialog, 3)).toHaveText(
		"Healing potion · Slot 3 · 2 carried",
	);
	// Onto the bag clears it.
	await mouseDrag(
		page,
		filledPotionSlot(dialog, 3),
		dialog.getByRole("list", { name: "Carried items" }),
	);
	await expect(potionSlot(dialog, 3)).toHaveText("Empty · Slot 3");
	// Released away from every target also clears it.
	await mouseDrag(page, bagItem(dialog, "Mana potion"), potionSlot(dialog, 2));
	await mouseDrag(
		page,
		filledPotionSlot(dialog, 2),
		dialog.getByRole("heading", { name: "The Adventurer's Ledger" }),
	);
	await expect(potionSlot(dialog, 2)).toHaveText("Empty · Slot 2");
	await expect(turns(page)).toHaveText("Turn 0");
	// Gear can't go on a potion shortcut.
	await mouseDrag(page, bagItem(dialog, "Iron sword"), potionSlot(dialog, 4));
	await expect(potionSlot(dialog, 4)).toHaveText("Empty · Slot 4");
});

test("keyboard: M on a bag potion, arrows to a shortcut, Enter assigns", async ({
	page,
}) => {
	await page.goto("/");
	await importAdventure(page, "drag-gear");
	const dialog = await openCharacter(page);
	await bagItem(dialog, "Mana potion").focus();
	await page.keyboard.press("m");
	const live = page.locator('[id^="DndLiveRegion"]');
	// Shortcut slots sit above the bag.
	await page.keyboard.press("ArrowUp");
	await expect(live).toContainText(/Mana potion is over potion slot \d/);
	await page.keyboard.press("Enter");
	await expect(
		dialog.getByText(/Mana potion · Slot \d · 1 carried/),
	).toBeVisible();
	await expect(turns(page)).toHaveText("Turn 0");
});

test("dragging a spell card onto a shortcut assigns it; dragging a shortcut off clears it", async ({
	page,
}) => {
	await page.goto("/");
	await importAdventure(page, "drag-gear");
	const dialog = await openCharacter(page);
	await dialog.getByRole("tab", { name: "Spells" }).click();
	const shortcut = (key: string) =>
		dialog.getByRole("button", {
			name: new RegExp(`^Spell shortcut ${key}: `),
		});
	await expect(shortcut("5")).toHaveAccessibleName(
		"Spell shortcut 5: Magic Missile",
	);
	const emptySlot = dialog
		.getByRole("region", { name: "Spell shortcuts" })
		.getByText("Empty")
		.first();
	await mouseDrag(
		page,
		dialog.getByRole("button", {
			name: "Drag Magic Missile to a spell shortcut",
		}),
		emptySlot,
	);
	// Assigning moves it: key 7 now holds it and key 5 is free.
	await expect(shortcut("7")).toHaveAccessibleName(
		"Spell shortcut 7: Magic Missile",
	);
	await expect(shortcut("5")).toHaveCount(0);
	await mouseDrag(
		page,
		shortcut("7"),
		dialog.getByRole("heading", { name: "The Adventurer's Ledger" }),
	);
	await expect(shortcut("7")).toHaveCount(0);
	await expect(turns(page)).toHaveText("Turn 0");
});

test("spell shortcuts stay in view while the spell list scrolls, so the last card can be dragged onto them", async ({
	page,
}) => {
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
	await expect(settings).toBeHidden();
	// The seed has perks waiting, which renames the Character button; use its key.
	await page.keyboard.press("c");
	const dialog = page.getByRole("dialog", {
		name: "The Adventurer's Ledger",
		exact: true,
	});
	await dialog.getByRole("tab", { name: "Spells" }).click();
	const list = dialog.getByTestId("spell-list-scroll");
	await list.evaluate((element) => element.scrollTo(0, element.scrollHeight));
	// Only the list scrolls; the tab and its shortcuts stay put.
	expect(await list.evaluate((element) => element.scrollTop)).toBeGreaterThan(
		0,
	);
	expect(
		await dialog
			.getByRole("tabpanel")
			.evaluate((element) => element.scrollHeight - element.clientHeight),
	).toBe(0);
	const shortcuts = dialog.getByRole("region", { name: "Spell shortcuts" });
	await expect(shortcuts).toBeInViewport({ ratio: 1 });
	const shortcut = (key: string) =>
		shortcuts.getByRole("button", {
			name: new RegExp(`^Spell shortcut ${key}: `),
		});
	await mouseDrag(
		page,
		dialog.getByRole("button", { name: "Drag Heal to a spell shortcut" }),
		shortcut("5"),
	);
	await expect(shortcut("5")).toHaveAccessibleName("Spell shortcut 5: Heal");
	await expect(shortcuts).toBeInViewport({ ratio: 1 });

	const nova = dialog.getByRole("button", {
		name: "Drag Frost Nova to a spell shortcut",
	});
	await nova.focus();
	await page.keyboard.press("m");
	await page.keyboard.press("ArrowUp");
	await expect(page.locator('[id^="DndLiveRegion"]')).toContainText(
		/Frost Nova is over the spell shortcut on key \d/,
	);
	await page.keyboard.press("Enter");
	await expect(
		shortcuts.getByRole("button", { name: /^Spell shortcut \d: Frost Nova$/ }),
	).toHaveCount(1);
	await expect(turns(page)).toHaveText("Turn 0");
});
