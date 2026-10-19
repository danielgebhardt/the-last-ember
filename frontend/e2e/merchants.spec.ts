import { expect, type Page, test } from "@playwright/test";
import { importAdventure, map, turns } from "./adventure-helpers.js";

// Dialog visibility can precede initial focus. Do not send a menu shortcut to the map.
const selectMerchantSellTab = async (page: Page) => {
	const merchant = page.getByRole("dialog", {
		name: "Wandering potion merchant",
		exact: true,
	});
	await expect(
		merchant.getByRole("heading", {
			name: "Wandering potion merchant",
			exact: true,
		}),
	).toBeFocused();
	await page.keyboard.press("s");
	await expect(
		merchant.getByRole("tab", { name: "Sell", exact: true }),
	).toHaveAttribute("aria-selected", "true");
};

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});
test("merchant uses four compact desktop columns and keeps narrow layouts within the dialog", async ({
	page,
}, testInfo) => {
	await importAdventure(page, "merchant-many");
	await page.keyboard.press("e");
	const merchant = page.getByRole("dialog", {
		name: "Wandering potion merchant",
		exact: true,
	});
	const buy = merchant.getByRole("tabpanel", { name: "Buy", exact: true });
	const offers = buy.getByRole("button");
	const first = await offers.nth(0).boundingBox();
	const fourth = await offers.nth(3).boundingBox();
	if (!first || !fourth) throw new Error("Expected purchase cards");
	expect(fourth.y).toBe(first.y);
	expect(fourth.x).toBeGreaterThan(first.x + first.width * 2);
	expect((await merchant.boundingBox())?.height).toBeLessThan(400);
	await page.screenshot({
		path: testInfo.outputPath("merchant-buy-desktop.png"),
	});
	await selectMerchantSellTab(page);
	const sell = merchant.getByRole("tabpanel", { name: "Sell", exact: true });
	const cards = sell.getByRole("listitem");
	const firstSale = await cards.nth(0).boundingBox();
	const fourthSale = await cards.nth(3).boundingBox();
	if (!firstSale || !fourthSale) throw new Error("Expected sale cards");
	expect(fourthSale.y).toBe(firstSale.y);
	expect(fourthSale.x).toBeGreaterThan(firstSale.x + firstSale.width * 2);
	await page.screenshot({
		path: testInfo.outputPath("merchant-sell-desktop.png"),
	});
	for (const width of [800, 390]) {
		await page.setViewportSize({ width, height: 667 });
		for (const name of ["Buy", "Sell"]) {
			await merchant.getByRole("tab", { name, exact: true }).click();
			const panel = merchant.getByRole("tabpanel", { name, exact: true });
			expect(
				await panel.evaluate((node) => node.scrollWidth <= node.clientWidth),
			).toBe(true);
			await expect(
				merchant.getByRole("button", { name: "Close", exact: true }),
			).toBeInViewport({ ratio: 1 });
			if (width === 390)
				await page.screenshot({
					path: testInfo.outputPath(
						`merchant-${name.toLowerCase()}-mobile.png`,
					),
				});
			if (name === "Buy") {
				await panel.getByRole("button").last().scrollIntoViewIfNeeded();
				await expect(panel.getByRole("button").last()).toBeInViewport({
					ratio: 1,
				});
			}
		}
	}
	await sell.locator("summary").first().click();
	expect(
		await sell.evaluate((node) => node.scrollWidth <= node.clientWidth),
	).toBe(true);
	await merchant.getByRole("button", { name: /Sell all Lower items/ }).click();
	await expect(
		merchant.getByRole("button", { name: "Confirm bulk sale", exact: true }),
	).toBeInViewport({ ratio: 1 });
	await expect(
		merchant.getByRole("button", { name: "Cancel bulk sale", exact: true }),
	).toBeInViewport({ ratio: 1 });
	await merchant
		.getByRole("button", { name: "Cancel bulk sale", exact: true })
		.click();
	await expect(turns(page)).toHaveText("Turn 0");
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
});

test("merchant comparisons open with Enter after import and only selling spends a turn", async ({
	page,
}, testInfo) => {
	await importAdventure(page, "merchant");
	await expect(
		page.getByLabel("Player experience", { exact: true }),
	).toContainText("0 / 30 XP");
	await expect(
		page.getByRole("progressbar", { name: "Player experience progress" }),
	).toHaveAttribute("max", "30");
	await page.keyboard.press("e");
	const merchant = page.getByRole("dialog", {
		name: "Wandering potion merchant",
		exact: true,
	});
	await expect(merchant).toBeVisible();
	await selectMerchantSellTab(page);
	const summary = merchant.getByText("Compare Ring of Intelligence", {
		exact: true,
	});
	await summary.press("Enter");
	const disclosure = merchant
		.locator("details")
		.filter({ hasText: "Compare Ring of Intelligence" });
	await expect(disclosure).toHaveAttribute("open", "");
	const previews = disclosure.getByLabel("Equipment comparison", {
		exact: true,
	});
	await expect(previews).toHaveCount(2);
	await expect(previews.nth(0)).toContainText("Tradeoff · Left ring");
	await expect(previews.nth(0)).toContainText("Damage 4–6 → 3–5");
	await expect(previews.nth(0)).toContainText("Base spell modifier +1 → +2");
	await expect(previews.nth(0)).toContainText("Magic resistance 6% → 7%");
	await expect(previews.nth(1)).toContainText("Maximum mana 16 → 14");
	await expect(previews.nth(1)).toContainText("Base spell modifier +1 → +2");
	await previews
		.nth(0)
		.getByText(/^Base spell modifier/)
		.first()
		.scrollIntoViewIfNeeded();
	await page.screenshot({
		path: testInfo.outputPath("merchant-spell-bonus.png"),
	});
	await expect(turns(page)).toHaveText("Turn 0");
	await expect(merchant.getByText("Gold 700", { exact: true })).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
	await page.keyboard.press("c");
	const character = page.getByRole("dialog", {
		name: "The Adventurer's Ledger",
		exact: true,
	});
	await expect(
		character.getByRole("button", {
			name: "Left ring: Ring of Strength",
			exact: true,
		}),
	).toBeVisible();
	await expect(
		character.getByLabel("Character mana", { exact: true }),
	).toContainText("3 / 16");
	await character
		.getByRole("button", { name: "Ring of Intelligence, slot 1", exact: true })
		.click();
	const characterPreviews = character.getByLabel("Equipment comparison", {
		exact: true,
	});
	await expect(characterPreviews).toHaveCount(2);
	await expect(characterPreviews.nth(0)).toContainText(
		"Base spell modifier +1 → +2",
	);
	await expect(characterPreviews.nth(1)).toContainText(
		"Magic resistance 6% → 7%",
	);
	await expect(
		character.getByText(/Control and movement effects/),
	).toBeVisible();
	await expect(turns(page)).toHaveText("Turn 0");
	await expect(
		character.getByLabel("Character mana", { exact: true }),
	).toContainText("3 / 16");
	await characterPreviews
		.nth(0)
		.getByText(/^Base spell modifier/)
		.first()
		.scrollIntoViewIfNeeded();
	await page.screenshot({
		path: testInfo.outputPath("character-spell-bonus.png"),
	});
	await page.keyboard.press("c");
	await expect(map(page)).toBeFocused();
	await page.keyboard.press("e");
	await selectMerchantSellTab(page);
	await merchant
		.getByRole("button", {
			name: "Short sword · Sell for 20 gold",
			exact: true,
		})
		.press("Enter");
	await expect(
		merchant.getByRole("button", {
			name: "Short sword · Sell for 20 gold",
			exact: true,
		}),
	).toBeHidden();
	await expect(merchant.getByText("Gold 720", { exact: true })).toBeVisible();
	await expect(turns(page)).toHaveText("Turn 1");
	await expect(
		merchant.getByRole("tab", { name: "Sell", exact: true }),
	).toBeFocused();
});

test("merchant bounds and unsold positions stay stable, and repeated clicks cannot sell the next item", async ({
	page,
}, testInfo) => {
	await importAdventure(page, "merchant-many");
	await page.keyboard.press("e");
	const merchant = page.getByRole("dialog", {
		name: "Wandering potion merchant",
		exact: true,
	});
	await expect(
		merchant.getByRole("heading", {
			name: "Wandering potion merchant",
			exact: true,
		}),
	).toBeFocused();
	await selectMerchantSellTab(page);
	const panel = merchant.getByRole("tabpanel", { name: "Sell", exact: true });
	const close = merchant.getByRole("button", { name: "Close", exact: true });
	const sales = merchant.getByRole("button", {
		name: "Short sword · Sell for 20 gold",
		exact: true,
	});
	const bounds = await merchant.boundingBox();
	const panelBounds = await panel.boundingBox();
	const closeBounds = await close.boundingBox();
	const first = await sales.nth(0).boundingBox();
	const second = await sales.nth(1).boundingBox();
	if (!first) throw new Error("Expected the first sale button");
	await sales.nth(0).click();
	await expect(turns(page)).toHaveText("Turn 1");
	expect(await sales.nth(0).boundingBox()).toEqual(second);
	await page.mouse.click(first.x + first.width / 2, first.y + first.height / 2);
	await expect(turns(page)).toHaveText("Turn 1");
	for (let turn = 2; turn <= 20; turn++) {
		await sales.nth(0).click();
		await expect(turns(page)).toHaveText(`Turn ${turn}`);
		expect(await merchant.boundingBox()).toEqual(bounds);
		expect(await panel.boundingBox()).toEqual(panelBounds);
		expect(await close.boundingBox()).toEqual(closeBounds);
	}
	await expect(
		merchant.getByText("No carried equipment to sell."),
	).toBeVisible();
	await expect(
		merchant.getByRole("tab", { name: "Sell", exact: true }),
	).toBeFocused();
	await page.screenshot({ path: testInfo.outputPath("merchant-empty.png") });
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
	await page.keyboard.press("e");
	await selectMerchantSellTab(page);
	await expect(merchant.getByText("Sold: Short sword")).toHaveCount(0);
	expect(await merchant.boundingBox()).toEqual(bounds);
});

test("bulk selling confirms only Lower gear and commits one turn without moving the merchant controls", async ({
	page,
}, testInfo) => {
	await importAdventure(page, "merchant-bulk");
	await page.keyboard.press("e");
	await selectMerchantSellTab(page);
	const merchant = page.getByRole("dialog", {
		name: "Wandering potion merchant",
		exact: true,
	});
	const bounds = await merchant.boundingBox();
	const close = merchant.getByRole("button", { name: "Close", exact: true });
	const closeBounds = await close.boundingBox();
	const bulk = merchant.getByRole("button", {
		name: "Sell all Lower items (2) · 45 gold",
		exact: true,
	});
	await bulk.press("Enter");
	await expect(
		merchant.getByRole("group", { name: "Confirm Lower equipment sale" }),
	).toBeFocused();
	await page.keyboard.press("Enter");
	await expect(turns(page)).toHaveText("Turn 0");
	await merchant
		.getByRole("button", { name: "Cancel bulk sale", exact: true })
		.click();
	await expect(turns(page)).toHaveText("Turn 0");
	await bulk.press("Enter");
	await page.keyboard.press("Tab");
	await expect(
		merchant.getByRole("button", { name: "Confirm bulk sale", exact: true }),
	).toBeFocused();
	await page.keyboard.press("Enter");
	await expect(turns(page)).toHaveText("Turn 1");
	await expect(merchant.getByText("Gold 745", { exact: true })).toBeVisible();
	await expect(
		merchant.getByRole("button", {
			name: "Sell all Lower items (0) · 0 gold",
			exact: true,
		}),
	).toBeDisabled();
	await expect(
		merchant.getByRole("button", {
			name: "Iron sword +1 · Sell for 25 gold",
			exact: true,
		}),
	).toHaveCount(1);
	await expect(
		merchant.getByRole("button", {
			name: "Short sword +3 · Sell for 35 gold",
			exact: true,
		}),
	).toHaveCount(1);
	await expect(
		merchant.getByRole("button", { name: /Scholar robe.*Sell for/ }),
	).toHaveCount(1);
	await expect(
		merchant.getByRole("button", { name: /Ring of Intelligence.*Sell for/ }),
	).toHaveCount(1);
	expect(await merchant.boundingBox()).toEqual(bounds);
	expect(await close.boundingBox()).toEqual(closeBounds);
	await page.keyboard.press("Enter");
	await expect(turns(page)).toHaveText("Turn 1");
	await page.screenshot({
		path: testInfo.outputPath("merchant-bulk-sold.png"),
	});
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
});
