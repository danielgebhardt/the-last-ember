import { expect, test } from "@playwright/test";
import { importAdventure, map } from "./adventure-helpers.js";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});
test("adventure layout keeps the dungeon usable beside a responsive Activity panel", async ({
	page,
}, testInfo) => {
	await importAdventure(page, "laptop-layout");
	for (const size of [
		{ width: 1024, height: 768 },
		{ width: 1280, height: 720 },
		{ width: 1468, height: 837 },
		{ width: 1440, height: 900 },
		{ width: 1920, height: 1080 },
	]) {
		await page.setViewportSize(size);
		for (const theme of ["Light", "Dark"]) {
			await page.getByRole("button", { name: "Settings", exact: true }).click();
			await page.getByRole("button", { name: theme, exact: true }).click();
			await page.keyboard.press("Escape");
			await expect(map(page)).toBeFocused();
			const status = await page
				.getByRole("region", { name: "Player status", exact: true })
				.boundingBox();
			const health = await page
				.getByLabel("Player health", { exact: true })
				.boundingBox();
			const mana = await page
				.getByLabel("Player mana", { exact: true })
				.boundingBox();
			const gold = await page
				.getByLabel("Player gold", { exact: true })
				.boundingBox();
			if (!status || !health || !mana || !gold)
				throw new Error("Expected player status");
			const rail = await page
				.getByRole("region", { name: "Player status", exact: true })
				.locator("../..")
				.boundingBox();
			if (!rail) throw new Error("Expected the command rail");
			expect(rail.width).toBeLessThanOrEqual(1328);
			expect(Math.abs(rail.x + rail.width / 2 - size.width / 2)).toBeLessThan(
				1,
			);
			await expect(
				page.getByLabel("Player experience", { exact: true }),
			).toBeVisible();
			const xpText = await page
				.getByLabel("Player experience", { exact: true })
				.boundingBox();
			const quest = await page
				.getByRole("region", { name: "Adventure quest", exact: true })
				.boundingBox();
			if (!xpText || !quest)
				throw new Error("Expected XP and objective bounds");
			expect(xpText.x + xpText.width + 4).toBeLessThanOrEqual(quest.x);

			expect(status.height).toBeLessThanOrEqual(80);
			expect(Math.abs(health.y - mana.y)).toBeLessThan(2);
			// The serif value uses a single 24px line; wrapping would double its height.
			expect(gold.height).toBeLessThanOrEqual(24);
			for (const name of ["Health reserve", "Mana reserve"]) {
				const bar = await page
					.getByRole("meter", { name, exact: true })
					.locator("..")
					.boundingBox();
				if (!bar) throw new Error("Expected a visible reserve bar");
				const value = name === "Health reserve" ? health : mana;
				const label = await page
					.getByRole("meter", { name, exact: true })
					.locator("../..")
					.locator(":scope > div")
					.first()
					.locator(":scope > span")
					.boundingBox();
				if (!label) throw new Error("Expected a resource label");
				expect(label.x + label.width + 2).toBeLessThanOrEqual(value.x);

				expect(
					Math.abs(value.x + value.width / 2 - bar.x - bar.width / 2),
				).toBeLessThan(1);
				expect(bar.height).toBeGreaterThanOrEqual(12);
				expect(bar.width).toBeGreaterThanOrEqual(76);
				expect(bar.width).toBeLessThanOrEqual(260);
			}
			const dungeon = await map(page).boundingBox();
			const activity = await page
				.getByRole("region", { name: "Activity", exact: true })
				.boundingBox();
			if (!dungeon || !activity)
				throw new Error("Expected map and activity bounds");
			console.log(
				`${size.width}×${size.height} ${theme}: dungeon ${((100 * dungeon.height) / size.height).toFixed(1)}% (${dungeon.height}px)`,
			);
			// The requested two-message footer reserves 48px more than before.
			expect(dungeon.height).toBeGreaterThanOrEqual(
				(size.width < 1280 ? 300 : 320) - 48,
			);
			expect(activity.x).toBeGreaterThanOrEqual(dungeon.x + dungeon.width);
			expect(activity.width).toBeGreaterThanOrEqual(280);
			expect(activity.width).toBe(
				size.width >= 1800 ? 416 : size.width >= 1280 ? 320 : 288,
			);
			expect(activity.y + activity.height).toBeLessThanOrEqual(size.height);
			expect(
				await page
					.locator("html")
					.evaluate((node) => node.scrollWidth <= node.clientWidth),
			).toBe(true);
			await page.screenshot({
				path: testInfo.outputPath(`laptop-${size.width}-${theme}.png`),
			});
		}
	}
});

test("interaction hints reserve their space without resizing the dungeon", async ({
	page,
}) => {
	await importAdventure(page, "interaction-hints");
	for (const size of [{ width: 1280, height: 720 }]) {
		await page.setViewportSize(size);
		const hints = page.getByRole("region", {
			name: "Nearby objects",
			exact: true,
		});
		await expect(hints).toHaveCount(0);
		const before = await map(page).boundingBox();
		await map(page).focus();
		await page.keyboard.press("ArrowRight");
		await expect(hints).toContainText("Press E within reach to open.");
		expect(await map(page).boundingBox()).toEqual(before);
		await expect(map(page)).toBeFocused();
		await page.keyboard.press("ArrowLeft");
		await expect(hints).toHaveCount(0);
		expect(await map(page).boundingBox()).toEqual(before);
	}
});

test("the wider rail keeps the floor-20 objective within two lines and leaves room for XP", async ({
	page,
}) => {
	await importAdventure(page, "corridor-large");
	const objective = page
		.getByRole("region", { name: "Adventure quest", exact: true })
		.getByLabel("Quest objective", { exact: true });
	await expect(objective).toHaveText(
		"Defeat the Ember Warden on floor 20 and claim its flame.",
	);
	for (const size of [
		{ width: 1024, height: 768 },
		{ width: 1280, height: 720 },
		{ width: 1920, height: 1080 },
	]) {
		await page.setViewportSize(size);
		const bounds = await objective.boundingBox();
		if (!bounds) throw new Error("Expected objective text");
		// The Warden objective, the longest, takes at most two lines in its card.
		expect(bounds.height).toBeLessThanOrEqual(32);
		const xp = await page
			.getByRole("progressbar", {
				name: "Player experience progress",
				exact: true,
			})
			.boundingBox();
		if (!xp) throw new Error("Expected XP track");
		expect(xp.width).toBeGreaterThanOrEqual(80);
		expect(
			await page
				.locator("html")
				.evaluate((node) => node.scrollWidth <= node.clientWidth),
		).toBe(true);
	}
});

test("dungeon artwork only loads the active theme image", async ({ page }) => {
	const requested = new Set<string>();
	page.on("request", (request) => {
		const url = request.url();
		if (url.includes("dungeon-frame-")) requested.add(url);
	});
	await importAdventure(page, "laptop-layout");
	await expect
		.poll(() =>
			[...requested].some((url) => url.includes("dungeon-frame-dark")),
		)
		.toBe(true);
	expect(
		[...requested].some((url) => url.includes("dungeon-frame-light")),
	).toBe(false);
	await page.getByRole("button", { name: "Settings", exact: true }).click();
	await page.getByRole("button", { name: "Light", exact: true }).click();
	await page.keyboard.press("Escape");
	await expect
		.poll(() =>
			[...requested].some((url) => url.includes("dungeon-frame-light")),
		)
		.toBe(true);
	await expect(map(page)).toBeFocused();
});

test("all player status icons and afflictions fit without moving the dungeon when they expire", async ({
	page,
}, testInfo) => {
	await importAdventure(page, "viewport-status-icons");
	for (const width of [1024, 1280, 1920]) {
		await page.setViewportSize({ width, height: width < 1024 ? 740 : 900 });
		const icons = page.getByRole("list", {
			name: "Active player conditions",
			exact: true,
		});
		// Worst case today: five timed effects plus the three-affliction cap.
		await expect(icons.getByRole("button")).toHaveCount(8);
		const bounds = await icons.boundingBox();
		if (!bounds) throw new Error("Expected icons");
		// One row at every width; overflow scrolls inside the list, harmful conditions first.
		expect(bounds.height).toBeLessThanOrEqual(32);
		expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
		await expect(icons.getByRole("button").first()).toHaveAccessibleName(
			"Disease — until cured",
		);
		for (const icon of await icons.getByRole("button").all()) {
			await icon.focus();
			const box = await icon.boundingBox();
			if (!box) throw new Error("Expected icon");
			expect(box.x).toBeGreaterThanOrEqual(0);
			expect(box.x + box.width).toBeLessThanOrEqual(width);
		}
		expect(
			await page
				.locator("html")
				.evaluate((node) => node.scrollWidth <= node.clientWidth),
		).toBe(true);
		await page.screenshot({
			path: testInfo.outputPath(`all-status-icons-${width}.png`),
			fullPage: true,
		});
	}
	await page.setViewportSize({ width: 1280, height: 720 });
	await map(page).focus();
	const before = await map(page).boundingBox();
	expect(before?.height).toBeGreaterThan(0);
	await page.keyboard.press("Space");
	await page.keyboard.press("Space");
	// Timed effects and poison expire; Disease and the longer Slowed remain.
	await expect(
		page
			.getByRole("list", { name: "Active player conditions", exact: true })
			.getByRole("button"),
	).toHaveCount(2);
	await expect(
		page.getByRole("button", {
			name: "Slowed — 8 phases remaining",
			exact: true,
		}),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Disease — until cured", exact: true }),
	).toBeVisible();
	expect(await map(page).boundingBox()).toEqual(before);
	await expect(map(page)).toBeFocused();
});

test("magic resistance stays readable in Character on desktop and mobile in both themes", async ({
	page,
}) => {
	await importAdventure(page);
	await page.keyboard.press("c");
	const character = page.getByRole("dialog", {
		name: "The Adventurer's Ledger",
		exact: true,
	});
	const resistance = character.getByLabel("Character magic resistance", {
		exact: true,
	});
	for (const width of [1280]) {
		await page.setViewportSize({ width, height: 800 });
		for (const dark of [false, true]) {
			await page
				.locator("html")
				.evaluate(
					(element, value) => element.classList.toggle("dark", value),
					dark,
				);
			await resistance.scrollIntoViewIfNeeded();
			await expect(resistance).toHaveText("Magic resistance 5%");
			await expect(resistance).toBeInViewport();
			await expect(
				character.getByText("Base 5% + Int 0% (max 50%)"),
			).toBeVisible();
			const fits = await resistance.evaluate((element) => {
				const card = element.parentElement;
				return card !== null && card.scrollWidth <= card.clientWidth;
			});
			expect(fits).toBe(true);
		}
	}
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
});

for (const size of [{ width: 1280, height: 720 }]) {
	test(`action errors do not shift the dungeon at ${size.width}px`, async ({
		page,
	}) => {
		await page.setViewportSize(size);
		await importAdventure(page, "viewport-error");
		const before = await map(page).boundingBox();
		await page.keyboard.press("6");
		await expect(
			page.getByLabel("Action feedback", { exact: true }),
		).toContainText("Not enough mana for Heal");
		expect(await map(page).boundingBox()).toEqual(before);
		await expect(map(page)).toBeFocused();
		await page.keyboard.press("Space");
		await expect(
			page.getByLabel("Action feedback", { exact: true }),
		).toHaveCount(0);
		expect(await map(page).boundingBox()).toEqual(before);
		await page.keyboard.press("e");
		await expect(
			page.getByLabel("Action feedback", { exact: true }),
		).toContainText(/dry/i);
		expect(await map(page).boundingBox()).toEqual(before);
		await page.keyboard.press("ArrowDown");
		await expect(
			page.getByLabel("Action feedback", { exact: true }),
		).toHaveCount(0);
		expect(await map(page).boundingBox()).toEqual(before);
	});

	for (const kind of ["brute", "charger"]) {
		test(`${kind} warnings do not shift the dungeon at ${size.width}px`, async ({
			page,
		}) => {
			await page.setViewportSize(size);
			await importAdventure(page, `viewport-${kind}`);
			const threats = page.getByRole("list", {
				name: "Visible threats",
				exact: true,
			});
			await expect(threats).toHaveCount(0);
			const before = await map(page).boundingBox();
			await page.keyboard.press("Space");
			await expect(threats).toContainText(
				kind === "brute"
					? "Move off the marked tile"
					: "Sidestep the marked line",
			);
			expect(await map(page).boundingBox()).toEqual(before);
			await page.keyboard.press("ArrowDown");
			if (kind === "charger") {
				await expect(threats).toContainText("Recovering");
				expect(await map(page).boundingBox()).toEqual(before);
				await page.keyboard.press("Space");
			}
			await expect(threats).toHaveCount(0);
			expect(await map(page).boundingBox()).toEqual(before);
			await expect(map(page)).toBeFocused();
		});
	}

	test(`poison icons replace notices and expiration does not shift the dungeon at ${size.width}px`, async ({
		page,
	}, testInfo) => {
		await page.setViewportSize(size);
		await importAdventure(page, "viewport-poison");
		const conditions = page.getByRole("list", {
			name: "Active player conditions",
			exact: true,
		});
		const poison = conditions.getByRole("button", {
			name: "Poison — 1 phase remaining",
		});
		await expect(poison).toBeVisible();
		await page.keyboard.press("g");
		const notices = page.getByRole("region", {
			name: "Dungeon notices",
			exact: true,
		});
		await expect(notices).toContainText("No items on this tile.");
		await expect(notices).not.toContainText("Poison");
		for (const theme of ["Light", "Dark"]) {
			await page.getByRole("button", { name: "Settings", exact: true }).click();
			await page.getByRole("button", { name: theme, exact: true }).click();
			await page.keyboard.press("Escape");
			await expect(map(page)).toBeFocused();
			await poison.click();
			const details = page.getByRole("dialog");
			await expect(details).toContainText("Cure: Antidote (one turn)");
			await expect(details).toBeInViewport({ ratio: 1 });
			await page.screenshot({
				path: testInfo.outputPath(`poison-icon-${theme}.png`),
			});
			await page.keyboard.press("Escape");
			await expect(details).toHaveCount(0);
		}

		await map(page).focus();
		const before = await map(page).boundingBox();
		await page.keyboard.press("Space");
		await expect(conditions).toHaveCount(0);
		expect(await map(page).boundingBox()).toEqual(before);
		await expect(map(page)).toBeFocused();
	});
}

test("the perk reminder fits beside the level and pulses only when motion is allowed", async ({
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
	// The test seed starts at level 10 with four perks waiting.
	const reminder = page.getByRole("button", {
		name: "4 perks: choose in Progression",
		exact: true,
	});
	const status = page.getByRole("region", {
		name: "Player status",
		exact: true,
	});
	for (const size of [
		{ width: 1470, height: 830 },
		{ width: 1180, height: 820 },
		{ width: 1024, height: 768 },
	])
		for (const theme of ["Light", "Dark"]) {
			await page.setViewportSize(size);
			await page.getByRole("button", { name: "Settings", exact: true }).click();
			await page.getByRole("button", { name: theme, exact: true }).click();
			await page.keyboard.press("Escape");
			await expect(reminder).toBeInViewport({ ratio: 1 });
			const pill = await reminder.boundingBox();
			const bar = await status.boundingBox();
			const level = await page
				.getByLabel("Player level", { exact: true })
				.boundingBox();
			if (!pill || !bar || !level) throw new Error("Expected the status bar");
			expect(pill.x + pill.width).toBeLessThanOrEqual(bar.x + bar.width);
			expect(pill.x).toBeGreaterThan(level.x + level.width);
		}
	const animation = () =>
		reminder.evaluate(
			(node) =>
				node.ownerDocument.defaultView?.getComputedStyle(node).animationName,
		);
	expect(await animation()).not.toBe("none");
	await page.emulateMedia({ reducedMotion: "reduce" });
	expect(await animation()).toBe("none");
	await reminder.click();
	await expect(
		page
			.getByRole("dialog", { name: "The Adventurer's Ledger", exact: true })
			.getByRole("tab", { selected: true }),
	).toHaveText(/^Progression/);
});

test("the Character tab fits without scrolling on laptop and both iPad sizes", async ({
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
	const character = page.getByRole("dialog", {
		name: "The Adventurer's Ledger",
		exact: true,
	});
	const overflow = () =>
		character
			.getByRole("tabpanel")
			.evaluate((panel) => panel.scrollHeight - panel.clientHeight);
	const check = async () => {
		for (const size of [
			{ width: 1470, height: 830 },
			{ width: 1180, height: 820 },
			{ width: 1024, height: 768 },
		]) {
			await page.setViewportSize(size);
			await page.keyboard.press("c");
			await expect(character).toBeVisible();
			// Polled: layout settles once fonts load after the resize.
			await expect
				.poll(overflow, { message: `${size.width}×${size.height}` })
				.toBe(0);
			await character
				.getByRole("button", { name: /^Warding Cloak, slot/ })
				.click();
			await expect(
				character.getByRole("region", { name: "Item details" }),
			).toBeVisible();
			await expect
				.poll(overflow, { message: `${size.width}×${size.height} selected` })
				.toBe(0);
			await page.keyboard.press("Escape");
			await expect(character).toBeHidden();
		}
	};
	await check();
	// The dungeon adds Nearby / Ground and, on arrival, a footer message.
	await page.getByLabel("Town map", { exact: true }).focus();
	await page.keyboard.type("ss");
	await page.keyboard.press("Enter");
	await expect(page.getByLabel("Dungeon map", { exact: true })).toBeFocused();
	await check();
});
