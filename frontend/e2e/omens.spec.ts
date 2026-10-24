import { expect, test } from "@playwright/test";
import { importAdventure, map } from "./adventure-helpers.js";

for (const size of [
	{ width: 1470, height: 830 },
	{ width: 1024, height: 768 },
])
	test(`a first arrival on an omen floor announces it once at ${size.width}×${size.height}`, async ({
		page,
	}, testInfo) => {
		await page.setViewportSize(size);
		await page.goto("/");
		await importAdventure(page, "omen-arrival");
		await page.keyboard.press("d");
		const dialog = page.getByRole("dialog", { name: "Ember-lit", exact: true });
		await expect(dialog).toBeInViewport({ ratio: 1 });
		await expect(dialog).toContainText(/^.*Floor \d · An omen/);
		await expect(
			dialog.getByRole("button", { name: "Continue", exact: true }),
		).toBeFocused();
		await page.screenshot({
			path: testInfo.outputPath(`omen-arrival-${size.width}.png`),
		});
		await page.keyboard.press("Enter");
		await expect(dialog).toBeHidden();
		await expect(map(page)).toBeFocused();
		const badge = page.getByRole("note", { name: /^Omen: Ember-lit\./ });
		await expect(badge).toBeVisible();
		await page.screenshot({
			path: testInfo.outputPath(`omen-badge-${size.width}.png`),
		});
	});
