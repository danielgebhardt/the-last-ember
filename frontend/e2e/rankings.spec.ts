import { expect, test } from "@playwright/test";

for (const size of [
	{ width: 1470, height: 830 },
	{ width: 1180, height: 820 },
	{ width: 1024, height: 768 },
])
	for (const theme of ["Light", "Dark"]) {
		test(`Rankings from opening, header and Help fit at ${size.width} ${theme}`, async ({
			page,
		}, testInfo) => {
			await page.setViewportSize(size);
			await page.route("**/api/rankings?*", async (route) => {
				const params = new URL(route.request().url()).searchParams;
				await route.fulfill({
					json: {
						rows: Array.from(
							{ length: params.has("after") ? 1 : 20 },
							(_, i) => ({
								rank: params.has("after") ? 21 : i + 1,
								displayName:
									i === 0 ? "WWWWWWWWWWWWWWWWWWWWWWWW" : "Ember Walker",
								outcome: i < 3 ? "won" : "died",
								deepestFloor: 20 - (i % 10),
								turns: 12345 + i,
								level: 20,
								acceptedAt: "2026-10-25T12:00:00.000Z",
							}),
						),
						next: params.has("after") ? null : "page-2",
						versions: ["0.3.0-alpha", "0.3.0-alpha.0"],
					},
				});
			});
			await page.goto("/");
			await page
				.getByRole("group", { name: "Appearance" })
				.getByText(theme, { exact: true })
				.click();
			await page.getByRole("button", { name: "Rankings", exact: true }).click();
			const sheet = page.getByRole("dialog", { name: "Rankings", exact: true });
			await expect(sheet.getByRole("table")).toBeVisible();
			expect(
				await sheet.evaluate((node) => node.scrollWidth <= node.clientWidth),
			).toBe(true);
			await page.screenshot({ path: testInfo.outputPath("global.png") });
			await sheet.getByRole("button", { name: "Next", exact: true }).click();
			await expect(sheet.getByText("#21", { exact: true })).toBeVisible();
			await expect(
				sheet.getByRole("button", { name: "Next", exact: true }),
			).toBeDisabled();
			await sheet
				.getByLabel("Difficulty", { exact: true })
				.selectOption("1.25");
			await expect(sheet.getByText("Page 1", { exact: true })).toBeVisible();
			await sheet
				.getByLabel("Game version", { exact: true })
				.selectOption("0.3.0-alpha.0");
			await sheet.getByRole("button", { name: "My runs", exact: true }).click();
			await expect(
				sheet.getByText("Your expeditions belong here", { exact: true }),
			).toBeVisible();
			await sheet.getByRole("button", { name: "Close", exact: true }).click();
			await page
				.getByRole("button", { name: "Begin Adventure", exact: true })
				.click();
			const nav = page.getByRole("navigation", { name: "Game actions" });
			const buttons = await nav.locator("button").evaluateAll((nodes) =>
				nodes.map((node) => ({
					top: node.getBoundingClientRect().top,
					right: node.getBoundingClientRect().right,
					labelWidth: node.querySelector("span")?.getBoundingClientRect().width,
				})),
			);
			expect(new Set(buttons.map((b) => Math.round(b.top))).size).toBe(1);
			expect(Math.max(...buttons.map((b) => b.right))).toBeLessThanOrEqual(
				size.width,
			);
			const label = nav
				.getByRole("button", { name: "Rankings", exact: true })
				.locator("span");
			if (size.width < 1280) expect((await label.boundingBox())?.width).toBe(1);
			if (size.width >= 1280)
				expect((await label.boundingBox())?.width).toBeGreaterThan(40);
			expect(
				(await page.locator("header").boundingBox())?.height,
			).toBeLessThanOrEqual(90);
			await page.screenshot({ path: testInfo.outputPath("header.png") });
			await nav.getByRole("button", { name: "Rankings", exact: true }).click();
			await expect(sheet.getByRole("table")).toBeVisible();
			await sheet.getByRole("button", { name: "Close", exact: true }).click();
			await expect(page.getByLabel("Town map", { exact: true })).toBeFocused();
			await nav.getByRole("button", { name: "Help", exact: true }).click();
			await expect(
				page.getByRole("heading", { name: "Help / Controls", exact: true }),
			).toBeFocused();
			await page.keyboard.press("Space");
			await expect(
				page.getByRole("dialog", { name: "Rankings", exact: true }),
			).toHaveCount(0);
			await page
				.getByRole("dialog", { name: "Help / Controls", exact: true })
				.getByRole("button", { name: "Rankings", exact: true })
				.click();
			await expect(sheet.getByRole("table")).toBeVisible();
		});
	}

test("Rankings failures can be retried without leaving the adventure", async ({
	page,
}) => {
	let available = false;
	await page.route("**/api/rankings?*", (route) =>
		route.fulfill(
			available
				? { json: { rows: [], next: null, versions: ["0.3.0-alpha"] } }
				: {
						status: 503,
						json: { error: "Rankings are unavailable. Try again shortly." },
					},
		),
	);
	await page.goto("/");
	await page.getByRole("button", { name: "Rankings", exact: true }).click();
	await expect(page.getByRole("alert")).toContainText(
		"Rankings are unavailable",
	);
	available = true;
	await page.getByRole("button", { name: "Try again", exact: true }).click();
	await expect(
		page.getByText("The next story could be yours", { exact: true }),
	).toBeVisible();
});
