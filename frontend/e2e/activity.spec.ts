import { expect, test } from "@playwright/test";
import { importAdventure, map, turns } from "./adventure-helpers.js";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});
test("Activity preserves older reading, counts new events and follows again without moving the player", async ({
	page,
}, testInfo) => {
	await importAdventure(page, "laptop-layout");
	const log = page.getByRole("log", { name: "Activity log", exact: true });
	await expect
		.poll(() =>
			log.evaluate(
				(node) => node.scrollHeight - node.clientHeight - node.scrollTop,
			),
		)
		.toBeLessThan(3);
	await log.evaluate((node) => {
		node.scrollTop = 0;
	});
	const latest = page.getByRole("button", { name: /Jump to latest activity/ });
	await expect(latest).toBeVisible();
	const first = log.locator("[data-entry-id]").first();
	const before = await first.boundingBox();
	await map(page).focus();
	await page.keyboard.press("h");
	await expect(turns(page)).toHaveText("Turn 21");
	await expect(latest).toHaveAccessibleName(
		"Jump to latest activity, 1 new event",
	);
	expect(
		Math.abs(((await first.boundingBox())?.y ?? 0) - (before?.y ?? 0)),
	).toBeLessThan(2);
	await expect(map(page)).toBeFocused();
	await latest.click();
	await expect(log).toBeFocused();
	await expect(latest).toBeHidden();
	await expect
		.poll(() =>
			log.evaluate(
				(node) => node.scrollHeight - node.clientHeight - node.scrollTop,
			),
		)
		.toBeLessThan(3);
	await page.keyboard.press("ArrowRight");
	await expect(turns(page)).toHaveText("Turn 21");
	await page.screenshot({ path: testInfo.outputPath("activity-latest.png") });
	await page.setViewportSize({ width: 800, height: 667 });
	const dungeon = await map(page).boundingBox();
	const activity = await page
		.getByRole("region", { name: "Activity", exact: true })
		.boundingBox();
	if (!dungeon || !activity) throw new Error("Expected stacked adventure");
	expect(activity.y).toBeGreaterThanOrEqual(dungeon.y + dungeon.height);
	expect(dungeon.height).toBeGreaterThanOrEqual(200);
	await expect
		.poll(() =>
			log.evaluate(
				(node) => node.scrollHeight - node.clientHeight - node.scrollTop,
			),
		)
		.toBeLessThan(3);
	await expect
		.poll(() =>
			log.evaluate(
				(node) => node.scrollHeight - node.clientHeight - node.scrollTop,
			),
		)
		.toBeLessThan(3);
	expect(
		await page
			.locator("html")
			.evaluate((node) => node.scrollWidth <= node.clientWidth),
	).toBe(true);
	await page.screenshot({
		path: testInfo.outputPath("activity-mobile.png"),
		fullPage: true,
	});
});
