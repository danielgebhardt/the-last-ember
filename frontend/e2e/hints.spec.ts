import { expect, type Page, test } from "@playwright/test";
import { importAdventure, map } from "./adventure-helpers.js";

const geometry = (page: Page) =>
	map(page).evaluate((element) => {
		const box = element.getBoundingClientRect();
		return {
			top: box.top,
			left: box.left,
			width: box.width,
			height: box.height,
		};
	});
const health = (page: Page) =>
	page.getByLabel("Player health", { exact: true });
const bleedOnce = async (page: Page) => {
	const before = await health(page).textContent();
	for (const key of ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"]) {
		await page.keyboard.press(key);
		if ((await health(page).textContent()) !== before) return;
	}
};

for (const size of [
	{ width: 1470, height: 830 },
	{ width: 1024, height: 768 },
])
	test(`a first-time hint appears once without moving the map at ${size.width}px`, async ({
		page,
	}, testInfo) => {
		await page.setViewportSize(size);
		await page.goto("/");
		await importAdventure(page, "bleeding");
		await map(page).click();
		const frame = await geometry(page);
		await bleedOnce(page);
		const hint = page.getByRole("region", { name: "Hint: Bleeding" });
		await expect(hint).toBeVisible();
		await expect(hint).toBeInViewport();
		expect(await geometry(page)).toEqual(frame);
		await page.screenshot({ path: testInfo.outputPath("hint.png") });
		await page.keyboard.press("Escape");
		await expect(hint).toBeHidden();
		await expect(map(page)).toBeFocused();
		await bleedOnce(page);
		await expect(hint).toBeHidden();

		// Seen flags live in this browser, so a reloaded run stays quiet too.
		await page.reload();
		await importAdventure(page, "bleeding");
		await map(page).click();
		await bleedOnce(page);
		await expect(
			page.getByRole("log", { name: "Activity log", exact: true }),
		).toContainText("You bleed for 1 damage.");
		await expect(hint).toBeHidden();
	});
