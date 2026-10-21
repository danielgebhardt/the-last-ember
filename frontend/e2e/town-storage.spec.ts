import { expect, type Locator, type Page, test } from "@playwright/test";
import { importAdventure, turns } from "./adventure-helpers.js";
import { mouseDrag } from "./drag-helpers.js";

const openStorage = async (page: Page) => {
	await importAdventure(page, "town-storage");
	await page.keyboard.press("e");
	const dialog = page.getByRole("dialog", { name: "Storage chest" });
	await expect(dialog).toBeVisible();
	return dialog;
};
const side = (dialog: Locator, name: "Bag items" | "Stored items") =>
	dialog.getByRole("list", { name });

for (const [width, height] of [
	[1470, 830],
	[1024, 768],
])
	test(`storage ${width}×${height}: store by click, drag and keyboard; take back; all free`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height });
		await page.goto("/");
		const dialog = await openStorage(page);
		const bag = side(dialog, "Bag items");
		const chest = side(dialog, "Stored items");

		// Click stores the whole stack.
		await bag.getByRole("button", { name: "Store Healing potion ×2" }).click();
		await expect(
			chest.getByRole("button", { name: "Take Healing potion ×2" }),
		).toBeFocused();
		await expect(dialog.getByLabel("Chest capacity")).toHaveText(
			"1 / 12 slots",
		);

		// Drag stores gear.
		await mouseDrag(
			page,
			bag.getByRole("button", { name: "Store Iron sword" }),
			chest,
		);
		await expect(
			chest.getByRole("button", { name: "Take Iron sword" }),
		).toBeVisible();

		// Keyboard: M, arrow across, Enter.
		await bag.getByRole("button", { name: "Store Copper ring" }).focus();
		await page.keyboard.press("m");
		await page.keyboard.press("ArrowRight");
		await expect(page.locator('[id^="DndLiveRegion"]')).toContainText(
			"Copper ring is over the storage chest.",
		);
		await page.keyboard.press("Enter");
		await expect(
			chest.getByRole("button", { name: "Take Copper ring" }),
		).toBeVisible();
		await page.screenshot({ path: info.outputPath(`storage-${width}.png`) });

		// Drag back to the bag.
		await mouseDrag(
			page,
			chest.getByRole("button", { name: "Take Iron sword" }),
			bag,
		);
		await expect(
			bag.getByRole("button", { name: "Store Iron sword" }),
		).toBeVisible();
		await expect(dialog.getByLabel("Chest capacity")).toHaveText(
			"2 / 12 slots",
		);

		await page.keyboard.press("Escape");
		await expect(dialog).toBeHidden();
		await expect(turns(page)).toHaveText("Turn 0");
	});
