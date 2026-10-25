import { expect, test } from "@playwright/test";
import { importAdventure, map, turns } from "./adventure-helpers.js";

for (const size of [
	{ width: 1470, height: 830 },
	{ width: 1180, height: 820 },
	{ width: 1024, height: 768 },
])
	for (const colorScheme of ["light", "dark"] as const)
		test(`a dark altar binds one pact at ${size.width}×${size.height} ${colorScheme}`, async ({
			page,
		}, testInfo) => {
			await page.emulateMedia({ colorScheme });
			await page.setViewportSize(size);
			await page.goto("/");
			await importAdventure(page, "dark-altar");
			await page.keyboard.press("e");
			const dialog = page.getByRole("dialog", {
				name: "Dark altar",
				exact: true,
			});
			await expect(dialog).toBeInViewport({ ratio: 1 });
			await expect(dialog).toContainText("cannot be undone");
			await expect(dialog.getByRole("button", { name: /^\d / })).toHaveCount(3);
			expect(
				await dialog.evaluate((node) => node.scrollHeight <= node.clientHeight),
			).toBe(true);
			await page.screenshot({
				path: testInfo.outputPath(`altar-${size.width}-${colorScheme}.png`),
			});
			// Walking away is free.
			await page.keyboard.press("Escape");
			await expect(map(page)).toBeFocused();
			await expect(turns(page)).toHaveText("Turn 0");
			await page.keyboard.press("e");
			await expect(
				dialog.getByRole("heading", { name: "Dark altar", exact: true }),
			).toBeFocused();
			const first = dialog.getByRole("button", { name: /^1 / });
			const name =
				(await first.locator("span.block.font-medium").textContent()) ?? "";
			await page.keyboard.press("1");
			await expect(dialog).toBeHidden();
			await expect(map(page)).toBeFocused();
			await expect(turns(page)).toHaveText("Turn 1");
			const badge = page.getByRole("status", {
				name: `Pact: ${name}.`,
				exact: false,
			});
			await expect(badge.first()).toBeVisible();
			await expect(page.getByRole("log")).toContainText(
				`You accept the ${name}.`,
			);
			await page.keyboard.press("c");
			const character = page.getByRole("dialog", {
				name: "The Adventurer's Ledger",
			});
			await expect(character).toContainText(`Bound by${name}`);
			const panel = character.getByRole("tabpanel").first();
			expect(
				await panel.evaluate((node) => node.scrollHeight <= node.clientHeight),
			).toBe(true);
			await page.screenshot({
				path: testInfo.outputPath(`character-${size.width}-${colorScheme}.png`),
			});
		});
