import { expect, test } from "@playwright/test";
import { importAdventure } from "./adventure-helpers.js";

test.use({ viewport: { width: 1470, height: 830 } });

test("a death shows its recap and is kept in the run history across reloads", async ({
	page,
}, info) => {
	await page.goto("/");
	await importAdventure(page, "poisoned");
	await page.keyboard.press("Space");
	const defeat = page.getByRole("dialog", { name: "You died", exact: true });
	const recap = defeat.getByRole("region", { name: "Run recap" });
	await expect(recap).toContainText("Conditions at the end: Poison");
	await expect(recap).toContainText("Deepest floor: 1");
	await page.screenshot({ path: info.outputPath("death-recap.png") });
	await defeat
		.getByRole("button", { name: "Inspect run", exact: true })
		.click();

	await page.getByRole("button", { name: "Settings", exact: true }).click();
	await page.getByRole("button", { name: "Run history", exact: true }).click();
	const history = page.getByRole("dialog", { name: "Run history" });
	await expect(history).toContainText(/Died on floor 1 of \d+ · turn 1/);
	await page.keyboard.press("Escape");

	// The record survives a reload and is reachable from the opening screen.
	await page.reload();
	await page.getByRole("button", { name: "Run history", exact: true }).click();
	await expect(
		history.getByRole("list", { name: "Finished adventures" }),
	).toContainText(/Died on floor 1/);
	await history.getByText(/Died on floor 1/).click();
	await expect(
		history.getByRole("region", { name: "Run recap" }),
	).toContainText("Poison");
	await page.screenshot({ path: info.outputPath("history.png") });
});
