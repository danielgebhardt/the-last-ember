import { expect, test } from "@playwright/test";
import { importAdventure, map, turns } from "./adventure-helpers.js";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});
test("a restored ember carrier cannot read an exit scroll", async ({
	page,
}) => {
	await importAdventure(page, "exit-scrolls-ember");
	await page.keyboard.press("i");
	const character = page.getByRole("dialog", {
		name: "The Adventurer's Ledger",
		exact: true,
	});
	await character
		.getByRole("button", { name: "Town portal scroll, slot 1", exact: true })
		.click();
	const read = character.getByRole("button", {
		name: "Read town portal scroll",
		exact: true,
	});
	await expect(read).toBeDisabled();
	await expect(read).toHaveAccessibleDescription(/carrying the Last Ember/);
	await expect(turns(page)).toHaveText("Turn 0");
	await expect(page.getByText("Floor 3 of 5", { exact: true })).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
});

test("improved spell cards and Fireball preview explain splash risk before a committed cast", async ({
	page,
}, testInfo) => {
	await importAdventure(page, "spell-balance");
	await page.keyboard.press("i");
	const character = page.getByRole("dialog", {
		name: "The Adventurer's Ledger",
		exact: true,
	});
	await character.getByRole("tab", { name: "Spells", exact: true }).click();
	await expect(
		character.getByRole("article", { name: "Fireball", exact: true }),
	).toContainText("16–24");
	await expect(
		character.getByRole("article", { name: "Protection", exact: true }),
	).toContainText("20 committed turns");
	await expect(
		character.getByRole("article", { name: "Renewal", exact: true }),
	).toContainText("2 HP/turn");
	await page.setViewportSize({ width: 1280, height: 800 });
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
	// Choice keys reach the dialog only after it takes focus; until then "1" goes to the map.
	await expect(
		choice.getByRole("heading", { name: "Sealed reliquary", exact: true }),
	).toBeFocused();
	await page.keyboard.press("1");
	await expect(
		page.getByRole("dialog", { name: "You died", exact: true }),
	).toBeVisible();
	await expect(page.getByRole("log")).toContainText("The seal deals 10 damage");
});

for (const width of [1280, 1440])
	for (const theme of ["Light", "Dark"]) {
		test(`town portal round trip persists its anchor at ${width}px ${theme}`, async ({
			page,
		}, testInfo) => {
			await page.setViewportSize({ width, height: width === 1280 ? 800 : 900 });
			await importAdventure(page, "exit-scrolls");
			await page.getByRole("button", { name: "Settings", exact: true }).click();
			await page.getByRole("button", { name: theme, exact: true }).click();
			await page.keyboard.press("Escape");
			await expect(map(page)).toBeFocused();
			const origin = await map(page)
				.getByRole("cell", { name: / - player$/ })
				.getAttribute("aria-label");
			await page.keyboard.press("i");
			const character = page.getByRole("dialog", {
				name: "The Adventurer's Ledger",
				exact: true,
			});
			await character
				.getByRole("button", {
					name: "Town portal scroll, slot 1",
					exact: true,
				})
				.click();
			await character
				.getByRole("button", { name: "Read town portal scroll", exact: true })
				.click();
			const town = page.getByLabel("Town map", { exact: true });
			await expect(character).toBeHidden();
			await expect(town).toBeFocused();
			await expect(page.getByLabel("Town portal status")).toContainText(
				"floor 3",
			);
			await expect(
				town.getByRole("cell", {
					name: /8, 9: player; town portal to floor 3/,
				}),
			).toBeVisible();
			await expect(turns(page)).toHaveText("Turn 1");
			await page.screenshot({
				path: testInfo.outputPath(`town-portal-${width}-${theme}.png`),
			});
			await page.keyboard.press("s");
			// Town business and walking preserve the anchor and scroll stack.
			await page.keyboard.press("c");
			await character
				.getByRole("button", {
					name: "Town portal scroll, slot 1",
					exact: true,
				})
				.click();
			await expect(
				character.getByRole("button", {
					name: "Mana potion, slot 2",
					exact: true,
				}),
			).toBeVisible();
			await page.keyboard.press("Escape");
			await expect(town).toBeFocused();
			await page
				.getByRole("button", { name: "Save/Load", exact: true })
				.click();
			await page
				.getByRole("button", { name: "Save adventure", exact: true })
				.click();
			await page
				.getByRole("button", { name: "Confirm save", exact: true })
				.click();
			const saved = await page.evaluate(() =>
				JSON.parse(localStorage.getItem("larn:adventure-save") ?? "null"),
			);
			expect(saved.version).toBe(28);
			expect(saved.state.townPortal.floorNumber).toBe(3);
			expect(
				saved.state.bag.items.filter(
					(item: { kind: string }) => item.kind === "exit-scroll",
				),
			).toHaveLength(1);
			await page.reload();
			await page
				.getByRole("button", { name: "Load an existing save", exact: true })
				.click();
			await page
				.getByRole("button", { name: "Load adventure", exact: true })
				.click();
			await page
				.getByRole("button", { name: "Confirm load", exact: true })
				.click();
			await expect(town).toBeFocused();
			await page.keyboard.press("w");
			await page.keyboard.press("Enter");
			await expect(map(page)).toBeFocused();
			await expect(
				page.getByText("Floor 3 of 5", { exact: true }),
			).toBeVisible();
			await expect(
				map(page).getByRole("cell", { name: / - player$/ }),
			).toHaveAttribute("aria-label", origin ?? "");
			await expect(turns(page)).toHaveText("Turn 1");
			await expect(page.getByRole("log")).toContainText("portal closes");
		});
	}

for (const width of [1280, 1440])
	test(`Forgotten Forge ${width}px: choose equipment, back out freely, then forge reliably`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: width === 1280 ? 800 : 900 });
		await importAdventure(page, "forge");
		await page.keyboard.press("e");
		const dialog = page.getByRole("dialog", {
			name: "Forgotten Forge",
			exact: true,
		});
		await expect(
			dialog.getByRole("heading", { name: "Forgotten Forge", exact: true }),
		).toBeFocused();
		await dialog
			.getByRole("button", { name: /Main hand: Iron sword \+1/ })
			.click();
		await expect(dialog).toContainText("Reliable forging · 300 gold");
		await expect(dialog).toContainText(
			"15%: Iron sword +1 is destroyed, even if worn.",
		);
		await dialog
			.getByRole("button", { name: "Choose different equipment", exact: true })
			.click();
		await expect(
			dialog.getByRole("button", { name: /Main hand: Iron sword \+1/ }),
		).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(map(page)).toBeFocused();
		await expect(turns(page)).toHaveText("Turn 0");

		await page.keyboard.press("e");
		await expect(
			dialog.getByRole("heading", { name: "Forgotten Forge", exact: true }),
		).toBeFocused();
		await dialog
			.getByRole("button", { name: /Main hand: Iron sword \+1/ })
			.click();
		await dialog.getByRole("button", { name: /Reliable forging/ }).click();
		await expect(dialog).toHaveCount(0);
		await expect(map(page)).toBeFocused();
		await expect(turns(page)).toHaveText("Turn 1");
		await expect(page.getByRole("log")).toContainText(
			"Your Iron sword is now +2.",
		);
		// A spent forge offers nothing and costs no turn.
		await page.keyboard.press("e");
		await expect(dialog).toHaveCount(0);
		await expect(turns(page)).toHaveText("Turn 1");
	});

test("Wishing Well shows every offering's odds, cancels freely and takes one offering", async ({
	page,
}) => {
	await importAdventure(page, "well");
	await page.keyboard.press("e");
	const dialog = page.getByRole("dialog", {
		name: "Wishing Well",
		exact: true,
	});
	await expect(
		dialog.getByRole("heading", { name: "Wishing Well", exact: true }),
	).toBeFocused();
	for (const text of [
		"Offer 50 gold",
		"40% reward",
		"Offer 100 gold",
		"55% reward",
		"Offer 250 gold",
		"15% a hostile floor creature",
	])
		await expect(dialog).toContainText(text);
	await page.keyboard.press("Escape");
	await expect(map(page)).toBeFocused();
	await expect(turns(page)).toHaveText("Turn 0");
	await page.keyboard.press("e");
	await expect(
		dialog.getByRole("heading", { name: "Wishing Well", exact: true }),
	).toBeFocused();
	await page.keyboard.press("1");
	await expect(dialog).toHaveCount(0);
	await expect(turns(page)).toHaveText("Turn 1");
	await expect(page.getByRole("log")).toContainText(
		"You offer 50 gold to the Wishing Well.",
	);
	await page.keyboard.press("e");
	await expect(dialog).toHaveCount(0);
});
