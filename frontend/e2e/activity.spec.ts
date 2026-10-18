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
	for (const width of [390, 320]) {
		await page.setViewportSize({ width, height: 667 });
		const status = page.getByRole("region", {
			name: "Player status",
			exact: true,
		});
		const health = await status
			.getByLabel("Player health", { exact: true })
			.boundingBox();
		const mana = await status
			.getByLabel("Player mana", { exact: true })
			.boundingBox();
		if (!health || !mana) throw new Error("Expected mobile resource values");
		expect(health.x + health.width).toBeLessThanOrEqual(mana.x);
		const slots = page.getByRole("group", { name: "Quick slots", exact: true });
		const controls = slots.locator("button, [role=img]");
		expect(await controls.count()).toBe(10);
		for (const control of await controls.all()) {
			const bounds = await control.boundingBox();
			if (!bounds) throw new Error("Expected every quick slot to be rendered");
			expect(bounds.x).toBeGreaterThanOrEqual(0);
			expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
		}
		const cards = await slots
			.locator('section[aria-label$="hotbar"] > div')
			.all();
		expect(cards).toHaveLength(10);
		const slotBounds = await slots.boundingBox();
		if (!slotBounds) throw new Error("Expected quick-slot bounds");
		const boxes = [];
		for (const card of cards) {
			const bounds = await card.boundingBox();
			if (!bounds) throw new Error("Expected a quick-slot card");
			expect(bounds.x).toBeGreaterThanOrEqual(slotBounds.x);
			expect(bounds.x + bounds.width).toBeLessThanOrEqual(
				slotBounds.x + slotBounds.width,
			);
			for (const previous of boxes) {
				const overlaps =
					bounds.x < previous.x + previous.width - 0.5 &&
					previous.x < bounds.x + bounds.width - 0.5 &&
					bounds.y < previous.y + previous.height - 0.5 &&
					previous.y < bounds.y + bounds.height - 0.5;
				expect(overlaps).toBe(false);
			}
			boxes.push(bounds);
		}

		expect(
			await page
				.locator("html")
				.evaluate((node) => node.scrollWidth <= node.clientWidth),
		).toBe(true);
		await page.screenshot({
			path: testInfo.outputPath(`activity-mobile-${width}.png`),
			fullPage: true,
		});
	}
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
