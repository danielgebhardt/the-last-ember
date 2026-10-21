import { expect, type Locator, type Page } from "@playwright/test";

// A real pointer drag: press, move past the activation distance, then over the target.
export const mouseDrag = async (page: Page, from: Locator, to: Locator) => {
	const start = await from.boundingBox();
	const end = await to.boundingBox();
	if (!start || !end) throw new Error("Drag endpoints must be visible");
	await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
	await page.mouse.down();
	await page.mouse.move(
		start.x + start.width / 2 + 10,
		start.y + start.height / 2,
		{ steps: 3 },
	);
	await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
		steps: 8,
	});
	await page.mouse.up();
};

// dnd-kit swallows clicks for 50ms after a pointer drag so a drop isn't also a click;
// a test acting faster than any player retries until its click lands. A swallowed
// click does nothing, so retrying never repeats an action.
export const clickAfterDrag = async (
	target: Locator,
	landed: () => Promise<void>,
) => {
	await expect(async () => {
		await target.click();
		await landed();
	}).toPass({ timeout: 5000 });
};
