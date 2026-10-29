import { expect, test } from "@playwright/test";
import { importAdventure, map, turns } from "./adventure-helpers.js";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});
test("The Warden's Flame introduces its quest and presents the historical quest item as an ember", async ({
	page,
}, testInfo) => {
	await expect(page).toHaveTitle("The Warden's Flame");
	await expect(page.locator('meta[name="description"]')).toHaveAttribute(
		"content",
		/defeat the corrupted Ember Warden, claim its flame/,
	);
	const opening = page.getByRole("dialog", {
		name: "The Warden's Flame",
		exact: true,
	});
	await expect(opening).toContainText(
		"For generations, the beacon has kept the darkness beyond your town's walls.",
	);
	await expect(opening).toContainText(
		"Their abandoned supplies may prove useful on your journey.",
	);
	await expect(opening).toContainText(
		"Inspired by the classic roguelike Larn.",
	);
	await expect(
		opening.getByRole("button", { name: "Begin Adventure", exact: true }),
	).toBeInViewport({ ratio: 1 });
	await expect(
		opening.getByRole("button", { name: "Load an existing save", exact: true }),
	).toBeInViewport({ ratio: 1 });
	await page.screenshot({ path: testInfo.outputPath("opening.png") });
	await page.setViewportSize({ width: 1280, height: 800 });
	await opening
		.getByRole("button", { name: "Begin Adventure", exact: true })
		.scrollIntoViewIfNeeded();
	await expect(
		opening.getByRole("button", { name: "Begin Adventure", exact: true }),
	).toBeInViewport();
	await page.setViewportSize({ width: 1280, height: 720 });
	await importAdventure(page, "ember-pickup");
	await page.keyboard.press("g");
	await expect(page.getByRole("log")).toContainText(
		"You claim the Warden's Flame.",
	);
	await expect(page.getByRole("log")).toContainText(
		"you must fight your way back to the surface.",
	);
	await page.keyboard.press("c");
	const pouch = page.getByLabel("Quest pouch", { exact: true });
	await expect(pouch).toContainText("Flame secured");
	await expect(pouch.locator("svg[data-full-color]:visible")).toHaveCount(1);
	await pouch.screenshot({ path: testInfo.outputPath("ember.png") });
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
	await expect(turns(page)).toHaveText("Turn 1");
});

test("returning the flame rekindles the beacon and preserves terminal victory behavior", async ({
	page,
}, testInfo) => {
	await importAdventure(page, "ember-homecoming");
	const position = await map(page)
		.getByRole("cell", { name: / - player$/, exact: false })
		.getAttribute("aria-label");
	const entrance = await map(page)
		.getByRole("cell", { name: / - entrance$/, exact: false })
		.getAttribute("aria-label");
	const parse = (label: string | null) => {
		const match = label?.match(/row(\d+)col(\d+)/);
		if (!match) throw new Error("Expected map coordinates");
		return { row: Number(match[1]), col: Number(match[2]) };
	};
	const start = parse(position),
		goal = parse(entrance);
	await page.keyboard.press(
		goal.row < start.row
			? "w"
			: goal.row > start.row
				? "s"
				: goal.col < start.col
					? "a"
					: "d",
	);
	const victory = page.getByRole("dialog", {
		name: "The Beacon Burns Again",
		exact: true,
	});
	await expect(victory).toContainText("The Warden's Flame ignites the beacon.");
	await expect(victory).toContainText(
		"By morning, someone has already complained about the smoke.",
	);
	await victory.screenshot({ path: testInfo.outputPath("victory.png") });
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
	await expect(turns(page)).toHaveText("Turn 1");
	await page.keyboard.press("Space");
	await expect(turns(page)).toHaveText("Turn 1");
});

test("the hunted ascent announces endgame hunters and explains cure sensing without stealing map focus", async ({
	page,
}) => {
	await importAdventure(page, "escape");
	await page.keyboard.press("a");
	await expect(turns(page)).toHaveText("Turn 6975");
	await expect(
		page.getByText(/The hunted return reaches floor 19/),
	).toBeVisible();
	await expect(map(page)).toBeFocused();
	await page.getByRole("button", { name: "Help", exact: true }).click();
	const hunted = page.getByRole("region", {
		name: "Hunted return",
		exact: true,
	});
	await expect(hunted).toContainText("up to 4 endgame hunters");
	await expect(hunted).toContainText("within 24 horizontal/vertical steps");
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
	await expect(turns(page)).toHaveText("Turn 6975");
});

test("a loaded late-game character shows the applied evasion curve and returns map focus without spending a turn", async ({
	page,
}) => {
	await importAdventure(page, "evasion");
	await page.keyboard.press("c");
	const character = page.getByRole("dialog", {
		name: "The Adventurer's Ledger",
		exact: true,
	});
	await expect(
		character.getByLabel("Character evasion", { exact: true }),
	).toHaveText("Evade 50%");
	await expect(
		character.getByLabel("Character hit chance", { exact: true }),
	).toHaveText("Hit 95%");
	await character.getByRole("tab", { name: /^Progression/ }).click();
	await expect(
		character.getByLabel("Character Dexterity", { exact: true }),
	).toHaveText("Dexterity 34");
	await character.getByText("Stat bonuses and growth", { exact: true }).click();
	await expect(character.getByText(/Hit 95% · evade 50%/)).toBeVisible();
	await expect(
		character.getByText(/Evasion gains 5 percentage points per 4 Dexterity\./),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(character).toBeHidden();
	await expect(map(page)).toBeFocused();
	await expect(turns(page)).toHaveText("Turn 6974");
});

test("map following keeps five-tile margins, preserves manual scrolling and centers in a tiny viewport", async ({
	page,
}) => {
	await importAdventure(page, "scrolling");
	const viewport = map(page);
	const player = page.getByRole("cell", {
		name: "row8col10 - player",
		exact: true,
	});
	const outerScroll = await viewport.evaluate((element) => ({
		x: element.ownerDocument.defaultView?.scrollX,
		y: element.ownerDocument.defaultView?.scrollY,
	}));
	await viewport.evaluate((element) => {
		element.style.flex = "none";
		element.style.width = "360px";
		element.style.height = "300px";
	});
	// Flush the layout/ResizeObserver cycle before setting the manual reading position.
	await viewport.evaluate((element) => {
		const view = element.ownerDocument.defaultView;
		if (!view) throw new Error("Expected the map to have a browser window");
		return new Promise<void>((resolve) =>
			view.requestAnimationFrame(() =>
				view.requestAnimationFrame(() => resolve()),
			),
		);
	});
	const manual = await viewport.evaluate((element) => {
		element.scrollLeft = element.scrollWidth;
		element.scrollTop = element.scrollHeight;
		return { left: element.scrollLeft, top: element.scrollTop };
	});
	await page.keyboard.press("Space");
	await expect(turns(page)).toHaveText("Turn 1");
	expect(
		await viewport.evaluate((element) => ({
			left: element.scrollLeft,
			top: element.scrollTop,
		})),
	).toEqual(manual);
	await viewport.evaluate((element) => {
		element.style.width = "359px";
		element.style.height = "299px";
	});
	await expect
		.poll(async () => {
			const view = await viewport.boundingBox();
			const tile = await player.boundingBox();
			if (!view || !tile) return null;
			return {
				horizontal: (tile.x - view.x) / tile.width,
				vertical: (tile.y - view.y) / tile.height,
			};
		})
		.toEqual({ horizontal: 5, vertical: 5 });
	await viewport.evaluate((element) => {
		element.style.width = "120px";
		element.style.height = "96px";
	});
	await expect
		.poll(async () => {
			const view = await viewport.boundingBox();
			const tile = await player.boundingBox();
			if (!view || !tile) return null;
			return {
				x: tile.x + tile.width / 2 - view.x,
				y: tile.y + tile.height / 2 - view.y,
			};
		})
		.toEqual({ x: 60, y: 48 });
	await expect(player).toBeInViewport({ ratio: 1 });
	await expect(viewport).toBeFocused();
	expect(
		await viewport.evaluate((element) => ({
			x: element.ownerDocument.defaultView?.scrollX,
			y: element.ownerDocument.defaultView?.scrollY,
		})),
	).toEqual(outerScroll);
	await expect(turns(page)).toHaveText("Turn 1");
});
