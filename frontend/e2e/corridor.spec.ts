import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { importAdventure, map, saveSheet, turns } from "./adventure-helpers.js";
import { enterDungeonFromTown } from "./town-helpers.js";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});
test("corridor running advances visible ordinary turns, stops at decisions and cancels across menus and load", async ({
	page,
}, testInfo) => {
	await importAdventure(page, "corridor");
	const cue = page.getByRole("status", {
		name: "Corridor travel",
		exact: true,
	});
	await page.keyboard.press("r");
	await expect(cue).toContainText("Choose a direction");
	await expect(turns(page)).toHaveText("Turn 0");
	await page.keyboard.press("Escape");
	await expect(turns(page)).toHaveText("Turn 0");
	await page.keyboard.press("r");
	await page.keyboard.press("ArrowRight");
	await expect(turns(page)).not.toHaveText("Turn 0");
	await page.keyboard.press("Shift");
	await expect(cue).toContainText("canceled");
	const canceled = await turns(page).innerText();
	await page.waitForTimeout(350);
	await expect(turns(page)).toHaveText(canceled);
	await page.getByRole("button", { name: "Save/Load", exact: true }).click();
	await page
		.getByLabel("Import adventure file")
		.setInputFiles(
			fileURLToPath(new URL(".generated/corridor.json", import.meta.url)),
		);
	await expect(map(page)).toBeFocused();
	await expect(turns(page)).toHaveText("Turn 0");
	await page.keyboard.press("r");
	await page.keyboard.press("d");
	await expect(cue).toContainText("stopped");
	const stopped = await turns(page).innerText();
	expect(Number(stopped?.replace("Turn ", ""))).toBeGreaterThanOrEqual(4);
	await page.waitForTimeout(300);
	await expect(turns(page)).toHaveText(stopped);
	await page.screenshot({ path: testInfo.outputPath("corridor-stop.png") });
	await page.keyboard.press("r");
	await page.keyboard.press("ArrowLeft");
	await page.getByRole("button", { name: "Help", exact: true }).click();
	const paused = await turns(page).innerText();
	await page.waitForTimeout(300);
	await expect(turns(page)).toHaveText(paused);
	await expect(
		page.getByRole("dialog", { name: "Help / Controls" }),
	).toContainText("Run a cleared room or quiet corridor");
	await page.keyboard.press("Escape");
	await map(page).focus();
	await page.waitForTimeout(300);
	await expect(turns(page)).toHaveText(paused);
	await page.getByRole("button", { name: "Save/Load", exact: true }).click();
	await page
		.getByLabel("Import adventure file")
		.setInputFiles(
			fileURLToPath(new URL(".generated/corridor.json", import.meta.url)),
		);
	await expect(map(page)).toBeFocused();
	await page.waitForTimeout(300);
	await expect(turns(page)).toHaveText("Turn 0");
});

test("fog-enabled corridor running uses discovered routes and stops with map focus intact", async ({
	page,
}) => {
	await importAdventure(page, "corridor-fog");
	await page.keyboard.press("r");
	await page.keyboard.press("ArrowRight");
	await expect(turns(page)).not.toHaveText("Turn 0");
	await expect(
		page.getByRole("status", { name: "Corridor travel", exact: true }),
	).toContainText("stopped");
	const stopped = await turns(page).innerText();
	await page.waitForTimeout(300);
	await expect(turns(page)).toHaveText(stopped);
	await expect(map(page)).toBeFocused();
});

test("maximum-size corridor running follows the player and responds to cancellation", async ({
	page,
}, testInfo) => {
	await importAdventure(page, "corridor-large");
	const initial = await map(page).evaluate((node) => ({
		left: node.scrollLeft,
		top: node.scrollTop,
	}));
	await page.keyboard.press("r");
	await page.keyboard.press("ArrowRight");
	await expect
		.poll(async () =>
			Number((await turns(page).innerText()).replace("Turn ", "")),
		)
		.toBeGreaterThanOrEqual(12);
	const started = Date.now();
	await page.keyboard.press("Control");
	await expect(
		page.getByRole("status", { name: "Corridor travel", exact: true }),
	).toContainText("canceled");
	const cancelMs = Date.now() - started;
	const stopped = await turns(page).innerText();
	await page.waitForTimeout(350);
	await expect(turns(page)).toHaveText(stopped);
	const scroll = await map(page).evaluate((node) => ({
		left: node.scrollLeft,
		top: node.scrollTop,
	}));
	expect(scroll.left).toBeGreaterThan(initial.left);
	const bounds = await map(page).boundingBox();
	const player = await map(page)
		.getByRole("cell", { name: / - player$/ })
		.boundingBox();
	if (!bounds || !player)
		throw new Error("Expected visible player and map bounds");
	expect(player.x).toBeGreaterThanOrEqual(bounds.x);
	expect(player.x + player.width).toBeLessThanOrEqual(bounds.x + bounds.width);
	expect(player.y).toBeGreaterThanOrEqual(bounds.y);
	expect(player.y + player.height).toBeLessThanOrEqual(
		bounds.y + bounds.height,
	);
	await expect(map(page)).toBeFocused();
	expect(
		await map(page).evaluate(
			(node) => node.ownerDocument.defaultView?.scrollY ?? 0,
		),
	).toBe(0);
	await testInfo.attach("large-map-cancellation.json", {
		body: JSON.stringify({ cancelMs, turn: stopped, initial, scroll }),
		contentType: "application/json",
	});
	await page.screenshot({
		path: testInfo.outputPath("large-corridor-canceled.png"),
	});
});

test("a queued corridor step stays canceled through confirmed save/load and a new adventure", async ({
	page,
}) => {
	await importAdventure(page, "corridor-large");
	await page.keyboard.press("r");
	await page.keyboard.press("d");
	await expect(turns(page)).not.toHaveText("Turn 0");
	await page.getByRole("button", { name: "Save/Load", exact: true }).click();
	const paused = await turns(page).innerText();
	await saveSheet(page)
		.getByRole("button", { name: "Save adventure", exact: true })
		.click();
	await page.getByRole("button", { name: "Confirm save", exact: true }).click();
	await expect(page.getByLabel("Save feedback")).toContainText(
		"Adventure saved",
	);
	const saved = await page.evaluate(() =>
		JSON.parse(localStorage.getItem("larn:adventure-save") ?? "null"),
	);
	expect(saved.state.turn).toBe(Number(paused.replace("Turn ", "")));
	await saveSheet(page)
		.getByRole("button", { name: "Close", exact: true })
		.click();
	await map(page).focus();
	await page.waitForTimeout(300);
	await expect(turns(page)).toHaveText(paused);
	await page.getByRole("button", { name: "Save/Load", exact: true }).click();
	await saveSheet(page)
		.getByRole("button", { name: "Load adventure", exact: true })
		.click();
	await page.getByRole("button", { name: "Confirm load", exact: true }).click();
	await expect(map(page)).toBeFocused();
	await page.waitForTimeout(300);
	await expect(turns(page)).toHaveText(paused);
	await expect(
		page.getByLabel(
			`row${saved.state.run.playerCoordinate.row}col${saved.state.run.playerCoordinate.col} - player`,
			{ exact: true },
		),
	).toBeVisible();
	await page.keyboard.press("r");
	await page.keyboard.press("d");
	await expect(
		page.getByRole("status", { name: "Corridor travel", exact: true }),
	).toContainText("Running");
	await page.getByRole("button", { name: "New Dungeon", exact: true }).click();
	await page
		.getByRole("button", { name: "Start new dungeon", exact: true })
		.click();
	await enterDungeonFromTown(page);
	await expect(turns(page)).toHaveText("Turn 0");
	await page.waitForTimeout(400);
	await expect(turns(page)).toHaveText("Turn 0");
	await expect(map(page)).toBeFocused();
});

test("a fatal ordinary corridor phase cancels its queue and replay starts idle", async ({
	page,
}) => {
	await importAdventure(page, "corridor-fatal");
	await page.keyboard.press("r");
	await page.keyboard.press("ArrowRight");
	const death = page.getByRole("dialog", { name: "You died", exact: true });
	await expect(death).toBeVisible();
	await expect(turns(page)).toHaveText("Turn 1");
	await page.waitForTimeout(350);
	await expect(turns(page)).toHaveText("Turn 1");
	await death
		.getByRole("button", { name: "Replay this seed", exact: true })
		.click();
	await expect(death).toBeHidden();
	await enterDungeonFromTown(page);
	await expect(map(page)).toBeFocused();
	await page.waitForTimeout(350);
	await expect(turns(page)).toHaveText("Turn 0");
});

test("New Dungeon cancellation keeps queued corridor steps canceled", async ({
	page,
}) => {
	await importAdventure(page, "corridor-large");
	await page.keyboard.press("r");
	await page.keyboard.press("ArrowRight");
	await expect(
		page.getByRole("status", { name: "Corridor travel", exact: true }),
	).toContainText("Running");
	await page.getByRole("button", { name: "New Dungeon", exact: true }).click();
	const dialog = page.getByRole("dialog", {
		name: "Start a new dungeon?",
		exact: true,
	});
	await expect(dialog).toBeVisible();
	const before = await turns(page).textContent();
	await page.waitForTimeout(300);
	await expect(turns(page)).toHaveText(before ?? "");
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
	await page.waitForTimeout(300);
	await expect(turns(page)).toHaveText(before ?? "");
	await page.keyboard.press("ArrowRight");
	await expect(turns(page)).not.toHaveText(before ?? "");
});

for (const width of [1280]) {
	test(`running crosses a cleared room into its corridor at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 720 });
		await importAdventure(page, "room-corridor");
		const cue = page.getByRole("status", {
			name: "Corridor travel",
			exact: true,
		});
		await page.keyboard.press("r");
		await page.keyboard.press("ArrowRight");
		await expect(turns(page)).toHaveText("Turn 9");
		await expect(cue).toContainText("Loot needs your attention");
		await expect(
			map(page).getByRole("cell", { name: /^row50col49 - player/ }),
		).toBeVisible();
		await expect(map(page)).toBeFocused();
		await page.screenshot({ path: info.outputPath(`room-run-${width}.png`) });
		// Turning back from the corridor still stops before entering the room.
		await page.keyboard.press("r");
		await page.keyboard.press("ArrowLeft");
		await expect(cue).toContainText("A room needs your attention");
		await expect(turns(page)).toHaveText("Turn 13");
		await expect(
			map(page).getByRole("cell", { name: /^row50col45 - player/ }),
		).toBeVisible();
	});
}
