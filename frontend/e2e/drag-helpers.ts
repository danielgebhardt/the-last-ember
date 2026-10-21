import type { Locator, Page } from "@playwright/test";

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
