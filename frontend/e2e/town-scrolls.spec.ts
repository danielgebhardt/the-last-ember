import { expect, test } from "@playwright/test";
import { importAdventure } from "./adventure-helpers.js";

// The 13" laptop browser area and the iPad, the smallest supported screen.
for (const [width, height] of [
	[1470, 830],
	[1024, 768],
])
	test(`scroll shop ${width}×${height}: buys a portal scroll for free time and keeps the stock`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height });
		await page.goto("/");
		await importAdventure(page, "town-scrolls");
		const map = page.getByLabel("Town map", { exact: true });
		await expect(map).toBeFocused();
		await page.keyboard.press("e");
		const shop = page.getByRole("dialog", { name: "Scroll shop" });
		await expect(shop.getByRole("listitem")).toHaveCount(2);
		await expect(shop).toContainText("carrying the Last Ember");
		await shop
			.getByRole("button", { name: "Buy Town portal scroll", exact: true })
			.click();
		await shop
			.getByRole("button", { name: "Confirm purchase", exact: true })
			.click();
		await expect(shop.getByText("Gold: 800", { exact: true })).toBeVisible();
		await expect(
			shop.getByText("200 gold · 2 remaining", { exact: true }),
		).toBeVisible();
		await expect(
			shop.getByRole("button", { name: "Leave scroll shop", exact: true }),
		).toBeInViewport();
		await page.screenshot({ path: info.outputPath(`scrolls-${width}.png`) });
		await page.keyboard.press("Escape");
		await expect(map).toBeFocused();
		await expect(page.getByLabel("Turn count")).toHaveText("Turn 0");
	});
