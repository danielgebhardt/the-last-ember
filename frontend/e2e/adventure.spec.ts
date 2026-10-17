import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import { enterDungeonFromTown } from "./town-helpers.js";

const map = (page: Page) => page.getByLabel("Dungeon map", { exact: true });
const turns = (page: Page) => page.getByLabel("Turn count", { exact: true });
const saveSheet = (page: Page) =>
	page.getByRole("dialog", { name: "Save/Load", exact: true });
const importAdventure = async (page: Page, name = "ready") => {
	await page
		.getByRole("button", { name: "Load an existing save", exact: true })
		.click();
	await expect(
		page.getByRole("button", { name: "Save adventure", exact: true }),
	).toBeHidden();
	await expect(
		page.getByRole("button", { name: "Export file", exact: true }),
	).toBeHidden();
	await page
		.getByLabel("Import adventure file")
		.setInputFiles(
			fileURLToPath(new URL(`.generated/${name}.json`, import.meta.url)),
		);
	await expect(
		page.getByRole("dialog", { name: "Load adventure", exact: true }),
	).toBeHidden();
	await expect(map(page)).toBeFocused();
};

test.beforeEach(async ({ page }) => {
	await page.goto("/"); // Playwright supplies a fresh browser context and storage for every test.
});

test("The Last Ember introduces its quest and presents the historical quest item as an ember", async ({
	page,
}, testInfo) => {
	await expect(page).toHaveTitle("The Last Ember");
	await expect(page.locator('meta[name="description"]')).toHaveAttribute(
		"content",
		/last ember/,
	);
	const opening = page.getByRole("dialog", {
		name: "The Last Ember",
		exact: true,
	});
	await expect(opening).toContainText(
		"The beacon above your settlement is dying.",
	);
	await expect(opening).toContainText("Their equipment may prove useful.");
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
	await page.setViewportSize({ width: 390, height: 667 });
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
		"The ember lifts easily from its cradle.",
	);
	await expect(page.getByRole("log")).toContainText(
		"Getting here was the quieter half of the journey.",
	);
	await page.keyboard.press("c");
	const pouch = page.getByLabel("Quest pouch", { exact: true });
	await expect(pouch).toContainText("Ember protected");
	await expect(pouch.locator("svg")).toHaveClass(/text-item-ember/);
	await pouch.screenshot({ path: testInfo.outputPath("ember.png") });
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
	await expect(turns(page)).toHaveText("Turn 1");
});

test("returning the ember rekindles the beacon and preserves terminal victory behavior", async ({
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
		name: "Adventure complete",
		exact: true,
	});
	await expect(victory).toContainText(
		"The beacon catches. Beyond the walls, the shapes retreat.",
	);
	await expect(victory).toContainText(
		"By morning, someone has complained about the smoke.",
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
		name: "Character",
		exact: true,
	});
	await expect(
		character.getByLabel("Character Dexterity", { exact: true }),
	).toHaveText("Dexterity 34");
	await expect(
		character.getByLabel("Character evasion", { exact: true }),
	).toHaveText("Evade 60%");
	await expect(
		character.getByLabel("Character hit chance", { exact: true }),
	).toHaveText("Hit 95%");
	await character.getByText("Stat bonuses and growth", { exact: true }).click();
	await expect(character.getByText(/Hit 95% · evade 60%/)).toBeVisible();
	await expect(
		character.getByText(/through 20, then per 4 Dexterity/),
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

test("fresh starts, New Dungeon and seed replay restore starter potions without locking their shortcuts", async ({
	page,
}) => {
	await page.getByRole("radio", { name: /Small/ }).check();
	await page
		.getByRole("button", { name: "Begin Adventure", exact: true })
		.click();
	await enterDungeonFromTown(page);
	await expect(
		page.getByRole("button", {
			name: "Potion slot 1: Healing potion, 1 carried",
			exact: true,
		}),
	).toBeVisible();
	await expect(
		page.getByRole("button", {
			name: "Potion slot 2: Mana potion, 1 carried",
			exact: true,
		}),
	).toBeVisible();
	await page.keyboard.press("1");
	await page.keyboard.press("2");
	await expect(turns(page)).toHaveText("Turn 0");
	await page.keyboard.press("c");
	const character = page.getByRole("dialog", {
		name: "Character",
		exact: true,
	});
	await character
		.getByRole("button", { name: "Healing potion, slot 1", exact: true })
		.click();
	await character
		.getByRole("button", { name: "Assign to potion slot 4", exact: true })
		.click();
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
	await expect(
		page.getByRole("button", { name: "Potion slot 1: empty", exact: true }),
	).toBeVisible();
	await expect(
		page.getByRole("button", {
			name: "Potion slot 4: Healing potion, 1 carried",
			exact: true,
		}),
	).toBeVisible();
	await page.getByRole("button", { name: "New Dungeon", exact: true }).click();
	await enterDungeonFromTown(page);
	await expect(
		page.getByRole("button", {
			name: "Potion slot 1: Healing potion, 1 carried",
			exact: true,
		}),
	).toBeVisible();
	await expect(
		page.getByRole("button", {
			name: "Potion slot 2: Mana potion, 1 carried",
			exact: true,
		}),
	).toBeVisible();
	await map(page).focus();
	await page.keyboard.press("c");
	await character
		.getByRole("button", { name: "Mana potion, slot 2", exact: true })
		.click();
	await character
		.getByRole("button", { name: "Assign to potion slot 3", exact: true })
		.click();
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Settings", exact: true }).click();
	const settings = page.getByRole("dialog", { name: "Settings", exact: true });
	await settings
		.getByRole("textbox", { name: "Dungeon seed", exact: true })
		.fill("123");
	await settings
		.getByRole("button", { name: "Start from seed", exact: true })
		.click();
	await enterDungeonFromTown(page);
	await expect(map(page)).toBeFocused();
	await expect(turns(page)).toHaveText("Turn 0");
	await expect(
		page.getByRole("button", {
			name: "Potion slot 1: Healing potion, 1 carried",
			exact: true,
		}),
	).toBeVisible();
	await expect(
		page.getByRole("button", {
			name: "Potion slot 2: Mana potion, 1 carried",
			exact: true,
		}),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Potion slot 3: empty", exact: true }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Potion slot 4: empty", exact: true }),
	).toBeVisible();
});

test("interleaved scroll stacks keep their coordinates and selected actions across three uses", async ({
	page,
}, testInfo) => {
	await importAdventure(page, "stacks");
	await page.keyboard.press("c");
	const character = page.getByRole("dialog", {
		name: "Character",
		exact: true,
	});
	const scroll = character.getByRole("button", {
		name: "Enchantment scroll, slot 1",
		exact: true,
	});
	const sword = character.getByRole("button", {
		name: "Iron sword +1, slot 2",
		exact: true,
	});
	const mana = character.getByRole("button", {
		name: "Mana potion, slot 3",
		exact: true,
	});
	await page.screenshot({
		path: testInfo.outputPath("stacks-grid-before.png"),
	});
	await scroll.click();
	const scrollBounds = await scroll.boundingBox();
	const swordBounds = await sword.boundingBox();
	const manaBounds = await mana.boundingBox();
	await page.screenshot({ path: testInfo.outputPath("stacks-before.png") });
	for (const bonus of [1, 2, 3]) {
		await character
			.getByRole("button", {
				name: `Enchant Main hand: Short sword${bonus > 1 ? ` +${bonus - 1}` : ""} to +${bonus}`,
				exact: true,
			})
			.press("Enter");
		await expect(turns(page)).toHaveText(`Turn ${bonus}`);
		await expect(
			character.getByRole("heading", { name: "Bag", exact: true }),
		).toBeFocused();
		if (bonus < 3) {
			await expect(scroll).toHaveAttribute("aria-pressed", "true");
			if (bonus === 1)
				await expect(scroll).toHaveAccessibleDescription("2 carried");
			expect(await scroll.boundingBox()).toEqual(scrollBounds);
			expect(await sword.boundingBox()).toEqual(swordBounds);
			expect(await mana.boundingBox()).toEqual(manaBounds);
			await page.screenshot({
				path: testInfo.outputPath(`stacks-${3 - bonus}-remaining.png`),
			});
			if (bonus === 2) {
				await character
					.getByRole("list", { name: "Carried items" })
					.scrollIntoViewIfNeeded();
				await page.screenshot({
					path: testInfo.outputPath("stacks-grid-one-remaining.png"),
				});
			}
		}
	}
	await expect(scroll).toBeHidden();
	await expect(
		character.getByRole("group", { name: "Choose equipment to enchant" }),
	).toBeHidden();
	await expect(
		character.getByRole("button", {
			name: "Iron sword +1, slot 1",
			exact: true,
		}),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
});

test("shortcut and Character potion use retain the stack, reject full mana freely, and clear final removal", async ({
	page,
}) => {
	await importAdventure(page, "stacks");
	await page.keyboard.press("1");
	await expect(turns(page)).toHaveText("Turn 1");
	await page.keyboard.press("c");
	const character = page.getByRole("dialog", {
		name: "Character",
		exact: true,
	});
	const mana = character.getByRole("button", {
		name: "Mana potion, slot 3",
		exact: true,
	});
	await expect(mana).toHaveAccessibleDescription("2 carried");
	await mana.click();
	const bounds = await mana.boundingBox();
	await character
		.getByRole("button", { name: "Drink potion", exact: true })
		.press("Enter");
	await expect(turns(page)).toHaveText("Turn 2");
	await expect(mana).toHaveAttribute("aria-pressed", "true");
	expect(await mana.boundingBox()).toEqual(bounds);
	await character
		.getByRole("button", { name: "Drink potion", exact: true })
		.click();
	await expect(character.getByRole("alert")).toHaveText(
		"You are already at full mana.",
	);
	await expect(turns(page)).toHaveText("Turn 2");
	await character
		.getByRole("button", { name: "Drop item", exact: true })
		.click();
	await expect(turns(page)).toHaveText("Turn 3");
	await expect(
		character.getByRole("button", { name: "Drink potion", exact: true }),
	).toBeHidden();
	await expect(
		character.getByRole("button", {
			name: "Tower shield, slot 3",
			exact: true,
		}),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
	await page.keyboard.press("g");
	await expect(turns(page)).toHaveText("Turn 4");
	await page.keyboard.press("c");
	await expect(
		character.getByRole("button", { name: "Mana potion, slot 4", exact: true }),
	).toHaveAttribute("aria-pressed", "false");
	await expect(
		character.getByRole("button", { name: "Drink potion", exact: true }),
	).toBeHidden();
});

test("welcome choices and keyboard Settings apply return control to the map", async ({
	page,
}) => {
	await expect(page.getByRole("radio", { name: /Medium/ })).toBeChecked();
	await page.getByRole("radio", { name: /Small/ }).check();
	await page.getByRole("radio", { name: /Harder/ }).check();
	await page
		.getByRole("button", { name: "Begin Adventure", exact: true })
		.click();
	await enterDungeonFromTown(page);
	await expect(map(page)).toBeFocused();
	await expect(
		page.getByLabel("Adventure difficulty", { exact: true }),
	).toHaveText("Harder");
	await page.getByRole("button", { name: "Settings", exact: true }).click();
	const settings = page.getByRole("dialog", { name: "Settings", exact: true });
	await expect(settings.getByLabel("Current dungeon configuration")).toHaveText(
		"20 rows × 20 columns · 20 floors",
	);
	await settings
		.getByRole("textbox", { name: "Dungeon seed", exact: true })
		.fill("123");
	await settings.getByRole("textbox", { name: "Rows", exact: true }).fill("15");
	await settings
		.getByRole("textbox", { name: "Columns", exact: true })
		.fill("15");
	await settings.getByRole("radio", { name: /Easier/ }).check();
	await settings
		.getByRole("textbox", { name: "Floors", exact: true })
		.fill("5");
	await settings
		.getByRole("textbox", { name: "Floors", exact: true })
		.press("Enter");
	await expect(settings).toBeHidden();
	await enterDungeonFromTown(page);
	await expect(map(page)).toBeFocused();
	await expect(
		page.getByRole("heading", { name: "Floor 1 of 5" }),
	).toBeVisible();
	await expect(
		page.getByLabel("Adventure difficulty", { exact: true }),
	).toHaveText("Easier");
	await page.keyboard.press("Space");
	await expect(turns(page)).toHaveText("Turn 1");
});

test("file import supports pickup and both hotbars without clicking the dungeon", async ({
	page,
}) => {
	await importAdventure(page);
	await expect(
		page.getByRole("button", { name: "Potion slot 1: empty", exact: true }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Potion slot 2: empty", exact: true }),
	).toBeVisible();
	await expect(
		page.getByLabel("Adventure difficulty", { exact: true }),
	).toHaveText("Harder");
	await page.keyboard.press("g");
	await expect(page.getByRole("log")).toContainText(
		"You pick up Healing potion",
	);
	await page.keyboard.press("1");
	await expect(page.getByLabel("Player health", { exact: true })).toContainText(
		"6 / 10",
	);
	await page.keyboard.press("6"); // The starting Heal spell's assigned slot.
	await expect(page.getByLabel("Player health", { exact: true })).toContainText(
		"10 / 10",
	);
	await expect(page.getByLabel("Player mana", { exact: true })).toContainText(
		"6 / 10",
	);
	await expect(turns(page)).toHaveText("Turn 3");
});

test("confirmed local saving and loading restore the earlier turn and keyboard healing", async ({
	page,
}) => {
	await importAdventure(page);
	await page.getByRole("button", { name: "Save/Load", exact: true }).click();
	await expect(
		saveSheet(page).getByRole("button", {
			name: "Load adventure",
			exact: true,
		}),
	).toBeDisabled();
	await saveSheet(page)
		.getByRole("button", { name: "Save adventure", exact: true })
		.click();
	await page.getByRole("button", { name: "Confirm save", exact: true }).click();
	await expect(
		page.getByRole("dialog", { name: "Save this adventure?" }),
	).toBeHidden();
	await expect(page.getByLabel("Save feedback")).toContainText(
		"Adventure saved",
	);
	await saveSheet(page)
		.getByRole("button", { name: "Close", exact: true })
		.click();
	await expect(saveSheet(page)).toBeHidden();
	// Closing without loading returns to the toolbar trigger; select the map to resume.
	await map(page).click();
	await expect(map(page)).toBeFocused();
	await page.keyboard.press("Space");
	await expect(turns(page)).toHaveText("Turn 1");
	await page.getByRole("button", { name: "Save/Load", exact: true }).click();
	await saveSheet(page)
		.getByRole("button", { name: "Load adventure", exact: true })
		.click();
	await page.getByRole("button", { name: "Confirm load", exact: true }).click();
	await expect(saveSheet(page)).toBeHidden();
	await expect(map(page)).toBeFocused();
	await expect(turns(page)).toHaveText("Turn 0");
	await page.keyboard.press("h");
	await expect(page.getByLabel("Player health", { exact: true })).toContainText(
		"5 / 10",
	);
	await expect(turns(page)).toHaveText("Turn 1");
});

test("a fatal committed turn opens defeat, freezes play and permits replay", async ({
	page,
}) => {
	await importAdventure(page, "poisoned");
	await page.keyboard.press("Space");
	const defeat = page.getByRole("dialog", { name: "You died", exact: true });
	await expect(defeat).toBeVisible();
	await expect(defeat.getByLabel("Run turns")).toHaveText("1");
	await expect(defeat.getByLabel("Defeat recap")).toContainText(/poison/i);
	await defeat
		.getByRole("button", { name: "Inspect run", exact: true })
		.click();
	await expect(defeat).toBeHidden();
	await page.keyboard.press("Space");
	await expect(turns(page)).toHaveText("Turn 1");
	await expect(page.getByLabel("Player health", { exact: true })).toContainText(
		"0 / 10",
	);
	await page.getByRole("button", { name: "Settings", exact: true }).click();
	await page
		.getByRole("button", { name: "Start from seed", exact: true })
		.click();
	await enterDungeonFromTown(page);
	await expect(
		page.getByRole("dialog", { name: "Settings", exact: true }),
	).toBeHidden();
	await expect(map(page)).toBeFocused();
	await expect(turns(page)).toHaveText("Turn 0");
	await expect(
		page.getByLabel("Adventure difficulty", { exact: true }),
	).toHaveText("Harder");
	await page.keyboard.press("Space");
	await expect(turns(page)).toHaveText("Turn 1");
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

for (const width of [390, 1280]) {
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

test("exit scroll reading returns to floor 1, preserves the stack and restores focus", async ({
	page,
}, testInfo) => {
	await importAdventure(page, "exit-scrolls");
	await page.keyboard.press("i");
	const character = page.getByRole("dialog", {
		name: "Character",
		exact: true,
	});
	const scroll = character.getByRole("button", {
		name: "Exit dungeon scroll, slot 1",
		exact: true,
	});
	await scroll.screenshot({
		path: testInfo.outputPath("exit-scroll-item.png"),
	});
	await scroll.click();
	const details = character.getByRole("region", {
		name: "Item details",
		exact: true,
	});
	await expect(details).toContainText("one scroll and one turn");
	await details.screenshot({ path: testInfo.outputPath("exit-scroll.png") });
	await details
		.getByRole("button", { name: "Read exit scroll", exact: true })
		.click();
	await expect(character).toBeHidden();
	await expect(map(page)).toBeFocused();
	await expect(page.getByText("Floor 1 of 5", { exact: true })).toBeVisible();
	await expect(turns(page)).toHaveText("Turn 1");
	await expect(page.getByLabel("Player health", { exact: true })).toContainText(
		"5 / 10",
	);
	await expect(page.getByLabel("Player mana", { exact: true })).toContainText(
		"0 / 10",
	);
	await expect(page.getByRole("log")).toContainText("read an exit scroll");
	await page.setViewportSize({ width: 390, height: 667 });
	await page.keyboard.press("i");
	await character
		.getByRole("button", { name: "Exit dungeon scroll, slot 1", exact: true })
		.click();
	await expect(
		character.getByRole("button", { name: "Mana potion, slot 2", exact: true }),
	).toBeVisible();
	await details
		.getByRole("button", { name: "Read exit scroll", exact: true })
		.click();
	await expect(character.getByRole("alert")).toContainText("already beside");
	await expect(turns(page)).toHaveText("Turn 1");
	await expect(character).toBeVisible();
	expect(
		await character.evaluate((node) => node.scrollWidth <= node.clientWidth),
	).toBe(true);
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
});

test("a restored ember carrier cannot read an exit scroll", async ({
	page,
}) => {
	await importAdventure(page, "exit-scrolls-ember");
	await page.keyboard.press("i");
	const character = page.getByRole("dialog", {
		name: "Character",
		exact: true,
	});
	await character
		.getByRole("button", { name: "Exit dungeon scroll, slot 1", exact: true })
		.click();
	const read = character.getByRole("button", {
		name: "Read exit scroll",
		exact: true,
	});
	await expect(read).toBeDisabled();
	await expect(read).toHaveAccessibleDescription(/carrying the Last Ember/);
	await expect(turns(page)).toHaveText("Turn 0");
	await expect(page.getByText("Floor 3 of 5", { exact: true })).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
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
	await page.keyboard.press("s");
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
	await page.keyboard.press("s");
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
	await expect(previews.nth(0)).toContainText(
		"Base spell modifier +1 → +2 (+1)",
	);
	await expect(previews.nth(0)).toContainText("Heal bonus +1 → +2 (+1)");
	await expect(previews.nth(1)).toContainText("Maximum mana 16 → 14 (−2)");
	await expect(previews.nth(1)).toContainText(
		"Base spell modifier +1 → +2 (+1)",
	);
	await previews
		.nth(0)
		.getByText(/^Base spell modifier/)
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
		name: "Character",
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
		"Base spell modifier +1 → +2 (+1)",
	);
	await expect(characterPreviews.nth(1)).toContainText(
		"Heal bonus +1 → +2 (+1)",
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
		.scrollIntoViewIfNeeded();
	await page.screenshot({
		path: testInfo.outputPath("character-spell-bonus.png"),
	});
	await page.keyboard.press("c");
	await expect(map(page)).toBeFocused();
	await page.keyboard.press("e");
	await page.keyboard.press("s");
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
	await page.keyboard.press("s");
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
	await page.keyboard.press("s");
	await expect(merchant.getByText("Sold: Short sword")).toHaveCount(0);
	expect(await merchant.boundingBox()).toEqual(bounds);
});

test("bulk selling confirms only Lower gear and commits one turn without moving the merchant controls", async ({
	page,
}, testInfo) => {
	await importAdventure(page, "merchant-bulk");
	await page.keyboard.press("e");
	await page.keyboard.press("s");
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

test("improved spell cards and Fireball preview explain splash risk before a committed cast", async ({
	page,
}, testInfo) => {
	await importAdventure(page, "spell-balance");
	await page.keyboard.press("i");
	const character = page.getByRole("dialog", {
		name: "Character",
		exact: true,
	});
	await character.getByRole("tab", { name: "Spells", exact: true }).click();
	await expect(
		character.getByRole("region", { name: "Fireball", exact: true }),
	).toContainText("16–24");
	await expect(
		character.getByRole("region", { name: "Protection", exact: true }),
	).toContainText("20 committed turns");
	await expect(
		character.getByRole("region", { name: "Renewal", exact: true }),
	).toContainText("Currently 2 health per turn");
	await page.setViewportSize({ width: 390, height: 667 });
	expect(
		await character.evaluate((node) => node.scrollWidth <= node.clientWidth),
	).toBe(true);
	await page.keyboard.press("Escape");
	await expect(character).toBeHidden();
	await expect(map(page)).toBeFocused();
	await page.keyboard.press("5");
	await expect(
		page.getByText(/Warning: you are inside the blast/),
	).toBeVisible();
	await page.screenshot({
		path: testInfo.outputPath("fireball-warning-mobile.png"),
	});
	await page.keyboard.press("Escape");
	await expect(turns(page)).toHaveText("Turn 0");
	await page.keyboard.press("5");
	await page.keyboard.press("Enter");
	await expect(turns(page)).toHaveText("Turn 1");
	await expect(page.getByRole("log")).toContainText("Fireball blast hits you");
	await expect(map(page)).toBeFocused();
});

test("fatal Fireball self-damage opens defeat with the blast in its recap", async ({
	page,
}) => {
	await importAdventure(page, "spell-balance-fatal");
	await page.keyboard.press("5");
	await page.keyboard.press("Enter");
	const death = page.getByRole("dialog", { name: "You died", exact: true });
	await expect(death).toBeVisible();
	await expect(death).toContainText("Fireball blast hits you");
	await page.keyboard.press("ArrowRight");
	await expect(turns(page)).toHaveText("Turn 1");
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

// Bounds must be checked in a real browser: jsdom cannot detect flex reflow.
for (const size of [
	{ width: 1280, height: 720 },
	{ width: 390, height: 667 },
]) {
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

	test(`poison expiration does not shift the dungeon at ${size.width}px`, async ({
		page,
	}, testInfo) => {
		await page.setViewportSize(size);
		await importAdventure(page, "viewport-poison");
		const conditions = page.getByRole("list", {
			name: "Your conditions",
			exact: true,
		});
		await expect(conditions).toContainText("Poisoned");
		await page.keyboard.press("g");
		const feedback = page.getByLabel("Action feedback", { exact: true });
		await expect(feedback).toContainText("No items on this tile.");
		// Long warnings stay scrollable, including when they wrap on a phone.
		const notices = page.getByRole("region", {
			name: "Dungeon notices",
			exact: true,
		});
		for (const theme of ["Light", "Dark"]) {
			await page.getByRole("button", { name: "Settings", exact: true }).click();
			await page.getByRole("button", { name: theme, exact: true }).click();
			await page.keyboard.press("Escape");
			await expect(map(page)).toBeFocused();
			const bounds = await notices.boundingBox();
			if (!bounds) throw new Error("Expected notice area");
			for (const message of [conditions, feedback]) {
				const messageBounds = await message.boundingBox();
				if (!messageBounds) throw new Error("Expected message");
				expect(messageBounds.y).toBeGreaterThanOrEqual(bounds.y);
				expect(messageBounds.y + messageBounds.height).toBeLessThanOrEqual(
					bounds.y + bounds.height,
				);
			}
		}
		await notices.focus();
		await expect(notices).toBeFocused();
		await page.screenshot({ path: testInfo.outputPath("poison-notice.png") });
		await map(page).focus();
		const before = await map(page).boundingBox();
		await page.keyboard.press("Space");
		await expect(conditions).toHaveCount(0);
		expect(await map(page).boundingBox()).toEqual(before);
		await expect(map(page)).toBeFocused();
	});
}

test("interaction hints reserve their space without resizing the dungeon", async ({
	page,
}) => {
	await importAdventure(page, "interaction-hints");
	for (const size of [
		{ width: 1280, height: 720 },
		{ width: 390, height: 667 },
	]) {
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

test("the wider rail keeps the floor-20 objective on one line and leaves room for XP", async ({
	page,
}) => {
	await importAdventure(page, "corridor-large");
	const objective = page
		.getByRole("region", { name: "Adventure quest", exact: true })
		.getByLabel("Quest objective", { exact: true });
	await expect(objective).toHaveText("Recover the last ember on floor 20.");
	for (const size of [
		{ width: 1024, height: 768 },
		{ width: 1280, height: 720 },
		{ width: 1920, height: 1080 },
	]) {
		await page.setViewportSize(size);
		const bounds = await objective.boundingBox();
		if (!bounds) throw new Error("Expected objective text");
		expect(bounds.height).toBeLessThanOrEqual(16);
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

for (const dismiss of ["Escape", "Close"]) {
	test(`saving to browser and dismissing with ${dismiss} returns movement focus`, async ({
		page,
	}) => {
		await importAdventure(page, "ready");
		await page.getByRole("button", { name: "Save/Load", exact: true }).click();
		await page
			.getByRole("button", { name: "Save adventure", exact: true })
			.click();
		await page
			.getByRole("button", { name: "Confirm save", exact: true })
			.click();
		await expect(
			page.getByRole("dialog", { name: "Save this adventure?", exact: true }),
		).toBeHidden();
		if (dismiss === "Escape") await page.keyboard.press("Escape");
		else
			await saveSheet(page)
				.getByRole("button", { name: "Close", exact: true })
				.click();
		await expect(map(page)).toBeFocused();
		await page.keyboard.press("Space");
		await expect(turns(page)).toHaveText("Turn 1");
	});
}

test("reliquary confirms its ten-health lethal sacrifice and supports free cancellation", async ({
	page,
}) => {
	await importAdventure(page, "reliquary-review");
	await page.keyboard.press("e");
	const choice = page.getByRole("dialog", {
		name: "Sealed reliquary",
		exact: true,
	});
	await expect(choice).toContainText(
		"Take 10 damage, ignoring armor and difficulty",
	);
	await expect(choice).toContainText("Health 10 → 0. This will kill you.");
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
	await expect(turns(page)).toHaveText("Turn 0");
	await expect(page.getByLabel("Player health", { exact: true })).toContainText(
		"10 / 10",
	);
	await page.keyboard.press("e");
	await page.keyboard.press("1");
	await expect(
		page.getByRole("dialog", { name: "You died", exact: true }),
	).toBeVisible();
	await expect(page.getByRole("log")).toContainText("The seal deals 10 damage");
});
