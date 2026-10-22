import { expect, type Page, test } from "@playwright/test";
import { importAdventure, map, turns } from "./adventure-helpers.js";

const marks = (page: Page) => page.getByTestId("combat-feedback");
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
const setTheme = async (page: Page, theme: "Light" | "Dark") => {
	await page.getByRole("button", { name: "Settings", exact: true }).click();
	await page.getByRole("button", { name: theme, exact: true }).click();
	await page.keyboard.press("Escape");
	await map(page).click();
};

for (const theme of ["Light", "Dark"] as const)
	test(`hits float over the map in ${theme} without moving it, and clear`, async ({
		page,
	}, testInfo) => {
		await page.setViewportSize({ width: 1470, height: 830 });
		await page.goto("/");
		await importAdventure(page, "plague-bite");
		await setTheme(page, theme);
		const frame = await geometry(page);
		const before = await turns(page).textContent();
		// The rat beside you bites on this turn.
		await page.keyboard.press("Space");
		await expect(turns(page)).not.toHaveText(before ?? "");
		await expect(marks(page).first()).toBeVisible();
		await expect(marks(page).filter({ hasText: /^-\d+$/ })).not.toHaveCount(0);
		expect(await geometry(page)).toEqual(frame);
		// Past the fade-in, so the screenshot shows the mark.
		await page.waitForTimeout(200);
		await page.screenshot({ path: testInfo.outputPath("feedback.png") });
		await expect(marks(page)).toHaveCount(0, { timeout: 3000 });
		expect(await geometry(page)).toEqual(frame);
	});

test("rapid turns never stack more than three marks on a tile, and reduced motion holds still", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("/");
	await importAdventure(page, "plague-bite");
	await map(page).click();
	for (let turn = 0; turn < 6; turn++) await page.keyboard.press("Space");
	await expect(marks(page).first()).toBeAttached();
	const tiles = await marks(page).evaluateAll((elements) =>
		elements.map((element) => element.getAttribute("style") ?? ""),
	);
	const perTile = new Map<string, number>();
	for (const tile of tiles) perTile.set(tile, (perTile.get(tile) ?? 0) + 1);
	expect(Math.max(0, ...perTile.values())).toBeLessThanOrEqual(3);
	expect(
		await marks(page)
			.first()
			.locator(".combat-feedback-mark")
			.evaluate(
				(element) =>
					element.ownerDocument.defaultView?.getComputedStyle(element)
						.animationName,
			),
	).toBe("combat-feedback-fade");
});
