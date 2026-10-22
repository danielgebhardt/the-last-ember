import { expect, test } from "@playwright/test";
import { map, saveSheet, turns } from "./adventure-helpers.js";
import { enterDungeonFromTown } from "./town-helpers.js";

test("a closed tab resumes from the autosave without touching the browser save", async ({
	page,
}, testInfo) => {
	await page.setViewportSize({ width: 1470, height: 830 });
	await page.goto("/");
	await expect(
		page.getByRole("button", { name: "Continue autosave" }),
	).toHaveCount(0);
	await page
		.getByRole("button", { name: "Begin Adventure", exact: true })
		.click();
	await enterDungeonFromTown(page);
	await page.keyboard.press("Space");
	const turn = await turns(page).textContent();

	await page.getByRole("button", { name: "Save/Load", exact: true }).click();
	const autosave = saveSheet(page).getByRole("region", { name: "Autosave" });
	await expect(autosave).toContainText(/Floor 1 of \d+/);
	await expect(
		saveSheet(page).getByRole("region", { name: "Browser save" }),
	).toContainText("No saved adventure yet.");
	await page.screenshot({ path: testInfo.outputPath("save-sheet-laptop.png") });
	await page.setViewportSize({ width: 1024, height: 768 });
	await page.screenshot({ path: testInfo.outputPath("save-sheet-ipad.png") });
	await page.keyboard.press("Escape");

	// Entering floor 1 was the last autosave; the wait after it is not saved.
	await page.reload();
	const resume = page.getByRole("button", { name: "Continue autosave" });
	await expect(resume).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath("opening.png") });
	await resume.click();
	await expect(map(page)).toBeVisible();
	await expect(
		page.getByRole("heading", { name: /^Floor 1 of / }),
	).toBeVisible();
	expect(await turns(page).textContent()).not.toBe(turn);
});
