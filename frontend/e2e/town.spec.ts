import { expect, test } from "@playwright/test";
import { enterDungeonFromTown } from "./town-helpers.js";

test("fixed town preview works in both themes on phone, laptop and desktop without changing the adventure", async ({
	page,
}, testInfo) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto("/");
	await page.getByRole("radio", { name: /Small/ }).locator("..").click();
	await page
		.getByRole("button", { name: "Begin Adventure", exact: true })
		.click();
	await enterDungeonFromTown(page);
	const map = page.getByLabel("Dungeon map", { exact: true });
	const originalPlayer = await map
		.getByRole("cell", { name: / - player$/ })
		.getAttribute("aria-label");
	for (const size of [
		{ width: 1280, height: 800 },
		{ width: 1920, height: 1080 },
	]) {
		await page.setViewportSize(size);
		for (const theme of ["Light", "Dark"]) {
			await page.getByRole("button", { name: "Settings", exact: true }).click();
			await page.getByRole("button", { name: theme, exact: true }).click();
			await page.keyboard.press("Escape");
			await page.getByRole("button", { name: "Catalog", exact: true }).click();
			const sheet = page.getByRole("dialog", { name: "Developer Catalog" });
			await sheet.getByRole("tab", { name: "Town", exact: true }).click();
			const preview = sheet.getByRole("region", { name: "Town map preview" });
			await preview.focus();
			await page.keyboard.type("sse");
			await expect(sheet.getByRole("status")).toContainText("not connected");
			const player = preview.getByRole("cell", { name: /19, 12: player/ });
			await expect(player).toBeInViewport();
			const [bounds, tile] = await Promise.all([
				preview.boundingBox(),
				player.boundingBox(),
			]);
			if (!bounds || !tile)
				throw new Error("Town viewport and player must render");
			expect(tile.x).toBeGreaterThanOrEqual(bounds.x);
			expect(tile.x + tile.width).toBeLessThanOrEqual(bounds.x + bounds.width);
			expect(
				await sheet.evaluate(
					(element) => element.scrollWidth <= element.clientWidth + 1,
				),
			).toBe(true);
			await sheet.getByRole("button", { name: "Walk north" }).click();
			await expect(sheet.getByText(/Position:/)).toContainText("18, 12");
			await expect(preview).toBeFocused();
			await page.screenshot({
				path: testInfo.outputPath(`town-${size.width}-${theme}.png`),
			});
			await page.keyboard.press("Escape");
			await expect(map).toBeFocused();
			await expect(
				map.getByRole("cell", { name: / - player$/ }),
			).toHaveAttribute("aria-label", originalPlayer ?? "");
			await expect(page.getByLabel("Turn count", { exact: true })).toHaveText(
				"Turn 0",
			);
		}
	}
	expect(errors).toEqual([]);
});
