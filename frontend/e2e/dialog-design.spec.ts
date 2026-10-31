import { expect, test } from "@playwright/test";
import { importAdventure, map, turns } from "./adventure-helpers.js";

for (const width of [1280]) {
	for (const theme of ["Light", "Dark"]) {
		test(`redesigned menus remain usable at ${width}px in ${theme}`, async ({
			page,
		}, testInfo) => {
			await page.setViewportSize({ width, height: 800 });
			await page.goto("/");
			await importAdventure(page, "spell-balance");
			const turn = await turns(page).textContent();
			await page.getByRole("button", { name: "Settings", exact: true }).click();
			await page
				.getByRole("dialog", { name: "Settings", exact: true })
				.getByRole("button", { name: theme, exact: true })
				.click();
			await page.keyboard.press("Escape");
			await expect(map(page)).toBeFocused();
			for (const [button, name] of [
				["Settings", "Settings"],
				["Help", "Help"],
				["Save/Load", "Save/Load"],
				["Catalog", "Developer Catalog"],
			]) {
				await page.getByRole("button", { name: button, exact: true }).click();
				const dialog = page.getByRole("dialog", { name, exact: true });
				await expect(dialog).toBeVisible();
				expect(
					await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
				).toBe(true);
				const close = dialog.getByRole("button", {
					name: "Close",
					exact: true,
				});
				await expect(close).toBeInViewport();
				// Sample both bounds in the same animation frame while the sheet settles.
				await expect
					.poll(() =>
						dialog.evaluate((node) => {
							const title = node.querySelector('[data-slot="sheet-title"]');
							const close = node.querySelector('[data-slot="sheet-close"]');
							return (
								!!title &&
								!!close &&
								title.getBoundingClientRect().right <=
									close.getBoundingClientRect().left
							);
						}),
					)
					.toBe(true);
				if (button === "Help") {
					await dialog.getByRole("tab", { name: "Map", exact: true }).click();
					await expect(
						dialog.getByRole("region", { name: "Map symbols" }),
					).toBeVisible();
				}
				await close.click();
				await expect(map(page)).toBeFocused();
			}
			await page.keyboard.press("c");
			const ledger = page.getByRole("dialog", {
				name: "The Adventurer's Ledger",
				exact: true,
			});
			await expect(
				ledger.getByRole("heading", {
					name: "The Adventurer's Ledger",
					exact: true,
				}),
			).toBeFocused();
			expect(
				await ledger.evaluate((node) => node.scrollWidth <= node.clientWidth),
			).toBe(true);
			await page.screenshot({ path: testInfo.outputPath("ledger.png") });
			await ledger.getByRole("tab", { name: "Spells", exact: true }).focus();
			await page.keyboard.press("ArrowLeft");
			await expect(
				ledger.getByRole("tab", { name: /^Progression/ }),
			).toHaveAttribute("aria-selected", "true");
			await page.keyboard.press("ArrowRight");
			await expect(
				ledger.getByRole("tab", { name: "Spells", exact: true }),
			).toHaveAttribute("aria-selected", "true");
			await expect(
				ledger.getByRole("article", { name: "Poison Dart", exact: true }),
			).toContainText("24 ongoing damage");
			await page.screenshot({ path: testInfo.outputPath("spells.png") });
			await page.keyboard.press("Escape");
			await expect(map(page)).toBeFocused();
			await expect(turns(page)).toHaveText(turn ?? "");
		});
	}
}

for (const theme of ["Light", "Dark"]) {
	test(`inventory comparisons keep their color and usable details in ${theme}`, async ({
		page,
	}, testInfo) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto("/");
		await importAdventure(page, "merchant-bulk");
		await page.getByRole("button", { name: "Settings", exact: true }).click();
		await page
			.getByRole("dialog", { name: "Settings", exact: true })
			.getByRole("button", { name: theme, exact: true })
			.click();
		await page.keyboard.press("Escape");
		await expect(map(page)).toBeFocused();
		await page.keyboard.press("c");
		const ledger = page.getByRole("dialog", {
			name: "The Adventurer's Ledger",
			exact: true,
		});
		const item = ledger.getByRole("button", {
			name: "Short sword, slot 1",
			exact: true,
		});
		await expect(item).toHaveAccessibleDescription(/Lower/);
		const colors = await item.evaluate((node) => {
			const sample = node.ownerDocument.createElement("span");
			sample.className = "border-red-500/70 dark:border-red-400/70";
			node.after(sample);
			const view = node.ownerDocument.defaultView;
			const actual = view?.getComputedStyle(node).borderTopColor;
			const expected = view?.getComputedStyle(sample).borderTopColor;
			sample.remove();
			return { actual, expected };
		});
		expect(colors.actual).toBeTruthy();
		expect(colors.actual).toBe(colors.expected);
		await item.click();
		const details = ledger.getByRole("region", {
			name: "Item details",
			exact: true,
		});
		await expect(details).toBeInViewport();
		await expect(
			details.getByRole("button", { name: "Equip on main hand", exact: true }),
		).toBeVisible();
		expect(
			await ledger.evaluate((node) => node.scrollWidth <= node.clientWidth),
		).toBe(true);
		await page.screenshot({
			path: testInfo.outputPath("inventory-details.png"),
		});
		await page.keyboard.press("Escape");
		await expect(map(page)).toBeFocused();
		await expect(turns(page)).toHaveText("Turn 0");
	});
}
