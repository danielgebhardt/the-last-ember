import { expect, test } from "@playwright/test";

for (const size of [
	{ width: 1470, height: 830 },
	{ width: 1180, height: 820 },
	{ width: 1024, height: 768 },
])
	for (const colorScheme of ["light", "dark"] as const) {
		test(`developer tools are unavailable to guests at ${size.width} ${colorScheme}`, async ({
			page,
		}) => {
			await page.setViewportSize(size);
			await page.emulateMedia({ colorScheme });
			let reads = 0;
			await page.route("**/api/developer-statistics*", (route) => {
				reads++;
				return route.fulfill({
					status: 403,
					json: { error: "Developer access required" },
				});
			});
			await page.goto("/#developer-statistics");
			const denied = page.getByRole("dialog", {
				name: "Developer access required",
				exact: true,
			});
			await expect(denied).toBeVisible();
			expect(reads).toBe(0);
			await denied.getByRole("button", { name: "Close", exact: true }).click();
			await expect(denied).toHaveCount(0);
			expect(new URL(page.url()).hash).toBe("");
			await expect(
				page.getByText("Developer generation", { exact: true }),
			).toHaveCount(0);
			await page
				.getByRole("button", { name: "Begin Adventure", exact: true })
				.click();
			await page.getByRole("button", { name: "Settings", exact: true }).click();
			await expect(
				page.getByText("Developer generation", { exact: true }),
			).toHaveCount(0);
			await page
				.getByRole("dialog", { name: "Settings", exact: true })
				.getByRole("button", { name: "Close", exact: true })
				.click();
			await page.getByRole("button", { name: "Catalog", exact: true }).click();
			const catalog = page.getByRole("dialog", {
				name: "Developer Catalog",
				exact: true,
			});
			await expect(
				catalog.getByRole("tab", { name: "Seed report", exact: true }),
			).toHaveCount(0);
			await expect(
				catalog.getByRole("tab", { name: "Town", exact: true }),
			).toBeVisible();
			expect(reads).toBe(0);
		});
	}
