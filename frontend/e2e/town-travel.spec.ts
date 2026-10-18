import { expect, test } from "@playwright/test";
import { enterDungeonFromTown } from "./town-helpers.js";

test("live town is centered over transparent space, preserves the dungeon, and restores its saved position", async ({
	page,
}, info) => {
	await page.goto("/");
	await page.getByRole("radio", { name: /Small/ }).locator("..").click();
	await page
		.getByRole("button", { name: "Begin Adventure", exact: true })
		.click();
	const town = page.getByLabel("Town map", { exact: true });
	await expect(town).toBeFocused();
	const layout = town.getByRole("table");
	for (const size of [
		{ width: 1920, height: 1080 },
		{ width: 1440, height: 900 },
		{ width: 1280, height: 800 },
		{ width: 1024, height: 768 },
		{ width: 390, height: 740 },
		{ width: 320, height: 667 },
	]) {
		await page.setViewportSize(size);
		for (const theme of ["Light", "Dark"]) {
			await page.getByRole("button", { name: "Settings", exact: true }).click();
			await page.getByRole("button", { name: theme, exact: true }).click();
			await page.keyboard.press("Escape");
			await expect(town).toBeFocused();
			await expect(town).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
			const welcome = page.getByRole("complementary", {
				name: "Welcome to Beacon",
				exact: true,
			});
			const [bounds, grid, panel] = await Promise.all([
				town.boundingBox(),
				layout.boundingBox(),
				welcome.boundingBox(),
			]);
			if (!bounds || !grid || !panel)
				throw new Error("Expected town presentation");
			if (size.width >= 1440)
				expect(panel.x).toBeGreaterThanOrEqual(bounds.x + bounds.width);
			else expect(panel.y).toBeGreaterThanOrEqual(bounds.y + bounds.height);
			expect(
				await page
					.locator("html")
					.evaluate((node) => node.scrollWidth <= node.clientWidth),
			).toBe(true);
			const directoryButton = welcome.getByRole("button", {
				name: "Town directory",
				exact: true,
			});
			await directoryButton.scrollIntoViewIfNeeded();
			await expect(directoryButton).toBeInViewport({ ratio: 1 });
			await page.screenshot({
				path: info.outputPath(`live-town-${size.width}-${theme}.png`),
			});
			await directoryButton.click();
			await expect(
				page.getByRole("dialog", { name: "Town directory", exact: true }),
			).toBeVisible();
			await page.keyboard.press("Escape");
			await expect(town).toBeFocused();
		}
	}

	await town.focus();
	await page.keyboard.press("?");
	const directory = page.getByRole("dialog", { name: "Town directory" });
	await expect(directory).toBeVisible();
	await expect(
		directory.getByRole("heading", { name: "Town directory", exact: true }),
	).toBeFocused();
	await expect(directory.getByRole("listitem")).toHaveCount(10);
	await page.keyboard.type("ss");
	await page.keyboard.press("Escape");
	await expect(town).toBeFocused();
	await expect(
		town.getByRole("cell", { name: /17, 12: player/ }),
	).toBeVisible();
	await enterDungeonFromTown(page);
	const map = page.getByLabel("Dungeon map", { exact: true });
	await expect(
		page.getByRole("button", { name: "Return to town (Enter)", exact: true }),
	).toHaveCount(0);
	await expect(
		page.getByRole("region", { name: "Dungeon notices", exact: true }),
	).toContainText("You see dungeon exit. Press Enter to return to town.");
	await page.screenshot({ path: info.outputPath("dungeon-exit-hint.png") });
	const original = await map
		.getByRole("cell", { name: / - player$/ })
		.getAttribute("aria-label");
	await page.keyboard.press("Enter");
	await expect(town).toBeFocused();
	await page.keyboard.press("a");
	await page.getByRole("button", { name: "Save/Load", exact: true }).click();
	await page
		.getByRole("button", { name: "Save adventure", exact: true })
		.click();
	await page.getByRole("button", { name: "Confirm save", exact: true }).click();
	const snapshot = await page.evaluate(() =>
		JSON.parse(localStorage.getItem("larn:adventure-save") ?? "null"),
	);
	expect(snapshot.state.town.coordinate).toEqual({ row: 17, col: 11 });
	expect(snapshot.state.run.activeFloor).toBe(1);
	await page.reload();
	await page
		.getByRole("button", { name: "Load an existing save", exact: true })
		.click();
	await page
		.getByRole("button", { name: "Load adventure", exact: true })
		.click();
	await page.getByRole("button", { name: "Confirm load", exact: true }).click();
	await expect(town).toBeFocused();
	await expect(
		town.getByRole("cell", { name: /17, 11: player/ }),
	).toBeVisible();
	await page.keyboard.press("d");
	await enterDungeonFromTown(page);
	await expect(map.getByRole("cell", { name: / - player$/ })).toHaveAttribute(
		"aria-label",
		original ?? "",
	);
	await expect(page.getByLabel("Turn count")).toHaveText("Turn 0");
});
