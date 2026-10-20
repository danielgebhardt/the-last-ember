import { expect, test } from "@playwright/test";
import { importAdventure, map, saveSheet, turns } from "./adventure-helpers.js";
import { enterDungeonFromTown } from "./town-helpers.js";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});
test("welcome choices and keyboard Settings apply return control to the map", async ({
	page,
}) => {
	await expect(page.getByRole("radio", { name: /Medium/ })).toBeChecked();
	await page.getByRole("radio", { name: /Small/ }).locator("..").click();
	await page
		.getByRole("radio", { name: /Harder/ })
		.locator("..")
		.click();
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
	await settings
		.getByRole("radio", { name: /Easier/ })
		.locator("..")
		.click();
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

for (const width of [1280])
	for (const theme of ["Light", "Dark"]) {
		test(`New Dungeon requires confirmation and restores map focus at ${width}px ${theme}`, async ({
			page,
		}, testInfo) => {
			await page.setViewportSize({ width, height: 720 });
			await importAdventure(page, "corridor-large");
			await page.getByRole("button", { name: "Settings", exact: true }).click();
			await page.getByRole("button", { name: theme, exact: true }).click();
			await page.keyboard.press("Escape");
			await expect(map(page)).toBeFocused();
			await page.keyboard.press("Space");
			const before = await turns(page).textContent();
			await page
				.getByRole("button", { name: "Save/Load", exact: true })
				.click();
			await page
				.getByRole("button", { name: "Save adventure", exact: true })
				.click();
			await page
				.getByRole("button", { name: "Confirm save", exact: true })
				.click();
			await page.keyboard.press("Escape");
			await expect(map(page)).toBeFocused();
			const saved = await page.evaluate(() =>
				localStorage.getItem("larn:adventure-save"),
			);
			const newDungeon = page.getByRole("button", {
				name: "New Dungeon",
				exact: true,
			});
			const dialog = page.getByRole("dialog", {
				name: "Start a new dungeon?",
				exact: true,
			});
			await newDungeon.click();
			await expect(dialog).toBeInViewport({ ratio: 1 });
			await expect(
				dialog.getByRole("button", { name: "Cancel", exact: true }),
			).toBeFocused();
			await page.keyboard.press("ArrowRight");
			await page.keyboard.press("6");
			await expect(turns(page)).toHaveText(before ?? "");
			await page.screenshot({
				path: testInfo.outputPath(`new-dungeon-${width}-${theme}.png`),
			});
			await page.keyboard.press("Escape");
			await expect(dialog).toHaveCount(0);
			await expect(map(page)).toBeFocused();
			await expect(turns(page)).toHaveText(before ?? "");
			await newDungeon.click();
			await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
			await expect(map(page)).toBeFocused();
			await expect(turns(page)).toHaveText(before ?? "");
			await newDungeon.click();
			await page.mouse.click(2, 2);
			await expect(dialog).toHaveCount(0);
			await expect(map(page)).toBeFocused();
			await expect(turns(page)).toHaveText(before ?? "");
			await newDungeon.click();
			await dialog
				.getByRole("button", { name: "Start new dungeon", exact: true })
				.click();
			const town = page.getByLabel("Town map", { exact: true });
			await expect(town).toBeFocused();
			await expect(turns(page)).toHaveText("Turn 0");
			expect(
				await page.evaluate(() => localStorage.getItem("larn:adventure-save")),
			).toBe(saved);
			await newDungeon.click();
			await page.keyboard.press("Escape");
			await expect(town).toBeFocused();
		});
	}
