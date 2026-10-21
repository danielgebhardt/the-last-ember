import { expect, type Page, test } from "@playwright/test";
import { importAdventure, turns } from "./adventure-helpers.js";
import { clickAfterDrag, mouseDrag } from "./drag-helpers.js";

test.use({ viewport: { width: 1470, height: 830 } });

const ragAndBone = async (page: Page) => {
	await importAdventure(page, "town-rag-and-bone");
	await page.keyboard.press("e");
	const dialog = page.getByRole("dialog", { name: "The Rag & Bone" });
	await expect(dialog).toBeVisible();
	return dialog;
};

test("dragging gear to the Rag & Bone's sell area asks before selling", async ({
	page,
}) => {
	await page.goto("/");
	const dialog = await ragAndBone(page);
	const gold = dialog.getByText(/^Gold \d+$/);
	const before = await gold.textContent();
	const sellArea = dialog.getByRole("button", {
		name: /^Sell all Lower items/,
	});
	const tradeoff = dialog.getByRole("button", {
		name: /^Scholar robe · Sell for/,
	});

	// Cancel keeps it.
	await mouseDrag(page, tradeoff, sellArea);
	const confirm = dialog.getByRole("group", { name: "Confirm equipment sale" });
	await expect(confirm).toContainText(/Sell Scholar robe for \d+ gold\?/);
	await expect(gold).toHaveText(before ?? "");
	await clickAfterDrag(
		confirm.getByRole("button", { name: "Cancel sale" }),
		() => expect(confirm).toBeHidden({ timeout: 300 }),
	);
	await expect(tradeoff).toBeEnabled();

	// Confirm sells it, free of dungeon time.
	await mouseDrag(page, tradeoff, sellArea);
	await clickAfterDrag(
		confirm.getByRole("button", { name: "Confirm sale" }),
		() =>
			expect(dialog.getByText("Sold: Scholar robe")).toBeVisible({
				timeout: 300,
			}),
	);
	await expect(gold).not.toHaveText(before ?? "");
	await expect(turns(page)).toHaveText("Turn 0");
});

test("dragging a bag stack onto the ground drops it all for one turn, only in the dungeon", async ({
	page,
}) => {
	await page.goto("/");
	await importAdventure(page, "drag-gear");
	await page.getByRole("button", { name: "Character", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "The Adventurer's Ledger" });
	const ground = dialog.getByRole("heading", { name: "Nearby / Ground" });
	await mouseDrag(
		page,
		dialog
			.getByRole("list", { name: "Carried items" })
			.getByRole("button", { name: /^Healing potion, slot/ }),
		ground,
	);
	await expect(turns(page)).toHaveText("Turn 1");
	await expect(
		dialog
			.getByRole("list", { name: "Carried items" })
			.getByRole("button", { name: /^Healing potion, slot/ }),
	).toHaveCount(0);
	await expect(dialog.getByText("You drop Healing potion ×2.")).toBeVisible();
});

test("in town the ground is not a drop target", async ({ page }) => {
	await page.goto("/");
	await importAdventure(page, "drag-gear-town");
	await page.getByRole("button", { name: "Character", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "The Adventurer's Ledger" });
	await mouseDrag(
		page,
		dialog
			.getByRole("list", { name: "Carried items" })
			.getByRole("button", { name: /^Healing potion, slot/ }),
		dialog.getByRole("heading", { name: "Nearby / Ground" }),
	);
	await expect(
		dialog
			.getByRole("list", { name: "Carried items" })
			.getByRole("button", { name: /^Healing potion, slot/ }),
	).toBeVisible();
});
