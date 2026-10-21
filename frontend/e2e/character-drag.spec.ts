import { expect, type Locator, type Page, test } from "@playwright/test";
import { importAdventure, turns } from "./adventure-helpers.js";

const character = (page: Page) =>
	page.getByRole("dialog", { name: "The Adventurer's Ledger", exact: true });
const openCharacter = async (page: Page) => {
	await page.getByRole("button", { name: "Character", exact: true }).click();
	await expect(character(page)).toBeVisible();
	return character(page);
};
const slot = (dialog: Locator, label: string) =>
	dialog.getByRole("button", { name: new RegExp(`^${label}: `) });
const bagItem = (dialog: Locator, name: string) =>
	dialog
		.getByRole("list", { name: "Carried items" })
		.getByRole("button", { name: new RegExp(`^${name}, slot`) });

// A real pointer drag: press, move past the activation distance, then over the target.
const mouseDrag = async (page: Page, from: Locator, to: Locator) => {
	const start = await from.boundingBox();
	const end = await to.boundingBox();
	if (!start || !end) throw new Error("Drag endpoints must be visible");
	await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
	await page.mouse.down();
	await page.mouse.move(
		start.x + start.width / 2 + 10,
		start.y + start.height / 2,
		{
			steps: 3,
		},
	);
	await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
		steps: 8,
	});
	await page.mouse.up();
};

test.describe("Character equipment drag", () => {
	test.use({ viewport: { width: 1470, height: 830 } });

	test("dragging gear onto its slot equips it for a turn; dragging it to the bag unequips", async ({
		page,
	}) => {
		await page.goto("/");
		await importAdventure(page, "drag-gear");
		const dialog = await openCharacter(page);
		await mouseDrag(
			page,
			bagItem(dialog, "Iron sword"),
			slot(dialog, "Main hand"),
		);
		await expect(slot(dialog, "Main hand")).toHaveAccessibleName(
			"Main hand: Iron sword",
		);
		await expect(turns(page)).toHaveText("Turn 1");
		await expect(slot(dialog, "Main hand")).toBeFocused();
		// The replaced short sword went back to the bag.
		await expect(bagItem(dialog, "Short sword")).toBeVisible();

		await mouseDrag(
			page,
			slot(dialog, "Main hand"),
			dialog.getByRole("list", { name: "Carried items" }),
		);
		await expect(slot(dialog, "Main hand")).toHaveAccessibleName(
			"Main hand: empty",
		);
		await expect(bagItem(dialog, "Iron sword")).toBeFocused();
		await expect(turns(page)).toHaveText("Turn 2");
	});

	test("a slot that doesn't fit ignores the drop and costs nothing", async ({
		page,
	}) => {
		await page.goto("/");
		await importAdventure(page, "drag-gear");
		const dialog = await openCharacter(page);
		await mouseDrag(page, bagItem(dialog, "Iron sword"), slot(dialog, "Head"));
		await expect(slot(dialog, "Head")).toHaveAccessibleName("Head: empty");
		await expect(bagItem(dialog, "Iron sword")).toBeVisible();
		await expect(turns(page)).toHaveText("Turn 0");
	});

	test("keyboard: M picks up, arrows choose a slot, Enter drops", async ({
		page,
	}) => {
		await page.goto("/");
		await importAdventure(page, "drag-gear");
		const dialog = await openCharacter(page);
		await bagItem(dialog, "Leather cap").focus();
		await page.keyboard.press("m");
		await expect(slot(dialog, "Head").locator("..")).toHaveClass(
			/ring-primary/,
		);
		// The only slot that takes a cap is to the left of the bag.
		await page.keyboard.press("ArrowLeft");
		await expect(page.locator('[id^="DndLiveRegion"]')).toContainText(
			"Leather cap is over the head slot.",
		);
		await page.keyboard.press("Enter");
		await expect(slot(dialog, "Head")).toHaveAccessibleName(
			"Head: Leather cap",
		);
		await expect(turns(page)).toHaveText("Turn 1");
		// Escape cancels a keyboard drag without closing the dialog or acting.
		await bagItem(dialog, "Copper ring").focus();
		await page.keyboard.press("m");
		await page.keyboard.press("Escape");
		await expect(dialog).toBeVisible();
		await expect(bagItem(dialog, "Copper ring")).toBeVisible();
		await expect(turns(page)).toHaveText("Turn 1");
		// Enter on an item still just selects it.
		await bagItem(dialog, "Copper ring").focus();
		await page.keyboard.press("Enter");
		await expect(bagItem(dialog, "Copper ring")).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	test("in town a drag equips for free", async ({ page }) => {
		await page.goto("/");
		await importAdventure(page, "drag-gear-town");
		const dialog = await openCharacter(page);
		await mouseDrag(
			page,
			bagItem(dialog, "Copper ring"),
			slot(dialog, "Left ring"),
		);
		await expect(slot(dialog, "Left ring")).toHaveAccessibleName(
			"Left ring: Copper ring",
		);
	});
});

test.describe("Character equipment drag on iPad", () => {
	test.use({
		viewport: { width: 1024, height: 768 },
		hasTouch: true,
		isMobile: true,
	});

	test("a press-and-drag equips; a quick tap still selects", async ({
		page,
	}, info) => {
		await page.goto("/");
		await importAdventure(page, "drag-gear");
		const dialog = await openCharacter(page);
		const sword = bagItem(dialog, "Iron sword");
		await sword.tap();
		await expect(sword).toHaveAttribute("aria-pressed", "true");
		await expect(turns(page)).toHaveText("Turn 0");

		const start = await sword.boundingBox();
		const end = await slot(dialog, "Main hand").boundingBox();
		if (!start || !end) throw new Error("Drag endpoints must be visible");
		const cdp = await page.context().newCDPSession(page);
		const point = (x: number, y: number) => [{ x, y, id: 1 }];
		const sx = start.x + start.width / 2,
			sy = start.y + start.height / 2,
			ex = end.x + end.width / 2,
			ey = end.y + end.height / 2;
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchStart",
			touchPoints: point(sx, sy),
		});
		await page.waitForTimeout(300);
		for (let step = 1; step <= 10; step++)
			await cdp.send("Input.dispatchTouchEvent", {
				type: "touchMove",
				touchPoints: point(
					sx + ((ex - sx) * step) / 10,
					sy + ((ey - sy) * step) / 10,
				),
			});
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchEnd",
			touchPoints: [],
		});
		await expect(slot(dialog, "Main hand")).toHaveAccessibleName(
			"Main hand: Iron sword",
		);
		await page.screenshot({ path: info.outputPath("ipad-after-drag.png") });
	});
});
