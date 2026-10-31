import { expect, type Locator, test } from "@playwright/test";
import { openCustomAdventure } from "./adventure-helpers";

const scrolls = (dialog: Locator) =>
	dialog.evaluate((element) =>
		[element, ...element.querySelectorAll("*")].some(
			(child) =>
				child.scrollHeight > child.clientHeight + 1 &&
				["auto", "scroll"].includes(
					child.ownerDocument.defaultView?.getComputedStyle(child).overflowY ??
						"",
				),
		),
	);

for (const size of [
	{ width: 1470, height: 830 },
	{ width: 1024, height: 768 },
])
	for (const colorScheme of ["light", "dark"] as const)
		test(`Settings and New adventure fit without scrolling at ${size.width} ${colorScheme}`, async ({
			page,
		}, testInfo) => {
			await page.setViewportSize(size);
			await page.emulateMedia({ colorScheme });
			await page.addInitScript((theme) => {
				localStorage.setItem("larn-theme", theme);
			}, colorScheme);
			await page.goto("/");
			await page
				.getByRole("button", { name: "Begin Adventure", exact: true })
				.click();
			await page.getByRole("button", { name: "Settings", exact: true }).click();
			const settings = page.getByRole("dialog", {
				name: "Settings",
				exact: true,
			});
			await expect(settings).toBeInViewport({ ratio: 1 });
			await expect(settings.getByText("Accounts & privacy")).toBeInViewport();
			expect(await scrolls(settings)).toBe(false);
			await page.screenshot({
				path: testInfo.outputPath(`settings-${size.width}-${colorScheme}.png`),
			});
			await page.keyboard.press("Escape");
			const custom = await openCustomAdventure(page);
			await expect(
				custom.getByRole("button", {
					name: "Start custom adventure",
					exact: true,
				}),
			).toBeInViewport({ ratio: 1 });
			expect(await scrolls(custom)).toBe(false);
			await page.waitForTimeout(200); // let the tab style settle
			await page.screenshot({
				path: testInfo.outputPath(`custom-${size.width}-${colorScheme}.png`),
			});
		});
