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
		{ width: 390, height: 667 },
	]) {
		await page.setViewportSize(size);
		await expect(town).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
		if (size.width > 1000) {
			const bounds = await town.boundingBox(),
				grid = await layout.boundingBox();
			if (!bounds || !grid) throw new Error("Expected town map");
			expect(
				Math.abs(grid.x + grid.width / 2 - bounds.x - bounds.width / 2),
			).toBeLessThan(2);
			expect(
				Math.abs(grid.y + grid.height / 2 - bounds.y - bounds.height / 2),
			).toBeLessThan(2);
		}
		await page.screenshot({
			path: info.outputPath(`live-town-${size.width}.png`),
		});
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
		town.getByRole("cell", { name: /17, 14: player/ }),
	).toBeVisible();
	await enterDungeonFromTown(page);
	const map = page.getByLabel("Dungeon map", { exact: true });
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
	expect(snapshot.state.town.coordinate).toEqual({ row: 17, col: 13 });
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
		town.getByRole("cell", { name: /17, 13: player/ }),
	).toBeVisible();
	await page.keyboard.press("d");
	await enterDungeonFromTown(page);
	await expect(map.getByRole("cell", { name: / - player$/ })).toHaveAttribute(
		"aria-label",
		original ?? "",
	);
	await expect(page.getByLabel("Turn count")).toHaveText("Turn 0");
});
