import { expect, test } from "@playwright/test";
import { openCustomAdventure } from "./adventure-helpers";

for (const size of [
	{ width: 1470, height: 830 },
	{ width: 1180, height: 820 },
	{ width: 1024, height: 768 },
])
	for (const colorScheme of ["light", "dark"] as const)
		test(`the opening describes the standard dungeon and Settings warns about unranked starts at ${size.width}×${size.height} ${colorScheme}`, async ({
			page,
		}, testInfo) => {
			await page.emulateMedia({ colorScheme });
			await page.setViewportSize(size);
			await page.goto("/");
			const opening = page.getByRole("dialog").first();
			const dungeon = opening.getByRole("region", { name: "The dungeon" });
			await expect(dungeon).toBeVisible();
			await expect(dungeon).toContainText("Twenty floors deep");
			await expect(dungeon).toContainText("40 × 40 tiles");
			const beginBounds = await opening
				.getByRole("button", { name: "Begin Adventure", exact: true })
				.boundingBox();
			const dungeonBounds = await dungeon.boundingBox();
			expect(
				beginBounds &&
					dungeonBounds &&
					beginBounds.x + beginBounds.width <= dungeonBounds.x,
			).toBe(true);
			await expect(opening.getByRole("radio", { name: /Small/ })).toHaveCount(
				0,
			);
			// The appearance choice switches the whole page between light and dark.
			const appearance = opening.getByRole("group", { name: "Appearance" });
			await appearance.getByText("Light", { exact: true }).click();
			await expect(page.locator("html")).not.toHaveClass(/dark/);
			await appearance.getByText("Dark", { exact: true }).click();
			await expect(page.locator("html")).toHaveClass(/dark/);
			await appearance
				.getByText(colorScheme === "light" ? "Light" : "Dark", { exact: true })
				.click();
			expect(
				await opening.evaluate(
					(node) => node.scrollHeight <= node.clientHeight,
				),
			).toBe(true);
			await page.screenshot({
				path: testInfo.outputPath(`opening-${size.width}-${colorScheme}.png`),
			});
			await page
				.getByRole("button", { name: "Begin Adventure", exact: true })
				.click();
			const settings = await openCustomAdventure(page);
			const start = settings.getByRole("button", {
				name: "Start custom adventure",
				exact: true,
			});
			await expect(start).toHaveAccessibleDescription(
				"Custom adventures aren't ranked, for victories or deaths. These choices are fixed for the whole run.",
			);
			await start.scrollIntoViewIfNeeded();
			await expect(
				settings.getByText("Custom adventures aren't ranked"),
			).toBeVisible();
		});
