import { expect, test } from "@playwright/test";
import { importAdventure, map, turns } from "./adventure-helpers.js";

test("sarcophagus risk dialog cancels freely, opens once with keyboard/mobile controls and preserves map focus", async ({
	page,
}, testInfo) => {
	await page.goto("/");
	await importAdventure(page, "sarcophagus");
	const dimensions = await map(page).boundingBox();
	await page.keyboard.press("e");
	const dialog = page.getByRole("dialog", {
		name: "Ancient sarcophagus",
		exact: true,
	});
	await expect(dialog).toBeVisible();
	await expect(dialog).toContainText("25% Heroic guardian");
	await expect(dialog).toContainText("Potentially fatal");
	await expect(turns(page)).toHaveText("Turn 0");
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
	await expect(map(page)).toHaveJSProperty(
		"clientHeight",
		Math.round(dimensions?.height ?? 0),
	);
	await page.setViewportSize({ width: 1280, height: 800 });
	await page
		.getByRole("button", { name: "Review sarcophagus", exact: true })
		.click();
	await expect(dialog).toBeVisible();
	expect(
		await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
	).toBe(true);
	await page.screenshot({
		path: testInfo.outputPath("sarcophagus-mobile.png"),
	});
	const mobileHeight = (await map(page).boundingBox())?.height;
	await page.keyboard.press("1");
	await expect(dialog).toBeHidden();
	await expect(turns(page)).toHaveText("Turn 1");
	expect((await map(page).boundingBox())?.height).toBe(mobileHeight);
	await expect(page.getByRole("log")).toContainText(
		"A Heroic guardian emerges!",
	);
	await expect(page.getByRole("cell", { name: /Heroic/ })).toBeVisible();
	await expect(map(page)).toBeFocused();
	await page.keyboard.press("e");
	await expect(turns(page)).toHaveText("Turn 1");
	await expect(
		page.getByRole("region", { name: "Nearby objects", exact: true }),
	).toContainText("tomb cannot be rerolled");
});
