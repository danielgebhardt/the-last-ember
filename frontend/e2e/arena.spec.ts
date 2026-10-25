import { expect, test } from "@playwright/test";
import { importAdventure, map, turns } from "./adventure-helpers.js";

for (const size of [
	{ width: 1470, height: 830 },
	{ width: 1180, height: 820 },
	{ width: 1024, height: 768 },
])
	for (const colorScheme of ["light", "dark"] as const)
		test(`the arena gate warns, then enters, at ${size.width}×${size.height} ${colorScheme}`, async ({
			page,
		}, testInfo) => {
			await page.emulateMedia({ colorScheme });
			await page.setViewportSize(size);
			await page.goto("/");
			await importAdventure(page, "arena-gate");
			await page.keyboard.press("e");
			const dialog = page.getByRole("dialog", {
				name: "Arena gate",
				exact: true,
			});
			await expect(dialog).toBeInViewport({ ratio: 1 });
			await expect(dialog).toContainText("No retreat");
			expect(
				await dialog.evaluate((node) => node.scrollHeight <= node.clientHeight),
			).toBe(true);
			await page.screenshot({
				path: testInfo.outputPath(`gate-${size.width}-${colorScheme}.png`),
			});
			// Walking away is free.
			await page.keyboard.press("Escape");
			await expect(map(page)).toBeFocused();
			await expect(turns(page)).toHaveText(/Turn \d+/);
			const before = await turns(page).textContent();
			await page.keyboard.press("e");
			await expect(
				dialog.getByRole("heading", { name: "Arena gate", exact: true }),
			).toBeFocused();
			await page.keyboard.press("1");
			await expect(dialog).toBeHidden();
			await expect(map(page)).toBeFocused();
			expect(await turns(page).textContent()).not.toBe(before);
			await expect(
				page.getByRole("heading", { name: /^Floor 6 of 10/ }),
			).toBeVisible();
			await expect(page.getByRole("log")).toContainText(
				"The gate grinds shut above you.",
			);
			await page.screenshot({
				path: testInfo.outputPath(`arena-${size.width}-${colorScheme}.png`),
			});
		});

test("the way back up stays sealed inside the arena", async ({ page }) => {
	await page.setViewportSize({ width: 1470, height: 830 });
	await page.goto("/");
	await importAdventure(page, "arena");
	await page.keyboard.press("d");
	const turn = await turns(page).textContent();
	await page.keyboard.press("a");
	await expect(
		page.getByRole("status", { name: "Action feedback" }),
	).toContainText("The way back is sealed until the arena is won.");
	await expect(turns(page)).toHaveText(turn ?? "");
});
