import { expect, test } from "@playwright/test";
import {
	analyticsResult,
	checkpoint,
	itemUsageFixtures,
} from "../src/__tests/AnalyticsTestFixtures";
import type { AnalyticsFilters } from "../src/developer/StatisticsAnalytics";
import { filterStatistics } from "../src/developer/StatisticsData";

// Replace only the lazy account adapter in this browser. No test account,
// telemetry submission or credential is created in any Firebase project.
const accountAdapter = `export function createFirebaseAccounts() { return {
 watch(listener) { listener({uid:"fixture-developer",email:null,name:"Local fixture",photo:null,developer:true});return ()=>{}; },
 idToken: async()=>"fixture-token", cloudStore:async()=>null,
 signInWithGoogle:async()=>{}, signInWithEmail:async()=>{}, createAccount:async()=>{}, signOut:async()=>{}
}; }`;
for (const size of [
	{ width: 1470, height: 830 },
	{ width: 1024, height: 768 },
	{ width: 1920, height: 1080 },
])
	for (const theme of ["Light", "Dark"]) {
		test(`analytics overview and Inspect fit at ${size.width} ${theme}`, async ({
			page,
		}, testInfo) => {
			await page.setViewportSize(size);
			await page.addInitScript(() =>
				localStorage.setItem("larn:signed-in", "fixture-developer"),
			);
			await page.route("**/assets/FirebaseAccounts-*.js", (route) =>
				route.fulfill({ contentType: "text/javascript", body: accountAdapter }),
			);
			await page.route("**/api/profile", (route) =>
				route.fulfill({ json: { displayName: null } }),
			);
			const fixtures = itemUsageFixtures();
			const telemetry = fixtures[0].summary.telemetry;
			if (!telemetry?.checkpoints || !telemetry.economy)
				throw Error("Fixture missing telemetry");
			telemetry.checkpoints.final = {
				floorNumber: null,
				outcome: "won",
				snapshot: checkpoint(1000),
			};
			telemetry.economy.town.purchases = {
				"town-potions": { "healing-potion": { quantity: 2, gold: 30 } },
			};
			telemetry.economy.town.goldOut = { purchases: 30 };
			let aggregates = 0,
				details = 0;
			await page.route("**/api/developer-statistics?*", (route) => {
				const params = new URL(route.request().url()).searchParams;
				if (params.has("id")) {
					details++;
					return route.fulfill({
						json: {
							rows: fixtures.filter((r) => r.id === params.get("id")),
							next: null,
						},
					});
				}
				aggregates++;
				const filters = Object.fromEntries(
					["from", "to", "version", "difficulty", "standard", "outcome"].map(
						(k) => [k, params.get(k) ?? ""],
					),
				) as AnalyticsFilters;
				const data = analyticsResult(
					filterStatistics(fixtures, filters),
					filters,
				);
				return route.fulfill({
					json: {
						...data,
						scanned: fixtures.length,
						versions: [...new Set(fixtures.map((r) => r.summary.gameVersion))],
					},
				});
			});
			await page.goto("/");
			await page
				.getByRole("group", { name: "Appearance" })
				.getByText(theme, { exact: true })
				.click();
			await page.goto("/#developer-statistics");
			const sheet = page.getByRole("dialog", {
				name: "Developer statistics",
				exact: true,
			});
			const load = sheet.getByRole("button", {
				name: "Load statistics",
				exact: true,
			});
			await expect(load).toBeVisible();
			expect(aggregates).toBe(0);
			await load.focus();
			await page.keyboard.press("Enter");
			await expect(
				sheet.getByLabel("Overview results", { exact: true }),
			).toBeVisible();
			expect(aggregates).toBe(1);
			expect(details).toBe(0);
			await page.screenshot({ path: testInfo.outputPath("initial.png") });
			await expect(
				sheet.getByRole("heading", { name: "Telemetry coverage", exact: true }),
			).toBeVisible();
			expect(
				await sheet.evaluate((node) => node.scrollWidth <= node.clientWidth),
			).toBe(true);
			await sheet.getByText("Floor reach values", { exact: true }).focus();
			await page.keyboard.press("Enter");
			await expect(
				sheet.getByRole("table", { name: "Observed floor reach", exact: true }),
			).toBeVisible();
			await page.screenshot({ path: testInfo.outputPath("overview.png") });
			await sheet
				.getByRole("button", { name: "Inspect run 1", exact: true })
				.click();
			await expect(sheet.getByText(/Run detail · Seed 1$/)).toBeVisible();
			await expect(
				sheet.getByRole("heading", { name: "Run summary", exact: true }),
			).toBeVisible();
			await sheet.getByLabel("Run location", { exact: true }).selectOption("1");
			await expect(
				sheet.getByRole("heading", { name: "First entry", exact: true }),
			).toBeVisible();
			await sheet
				.getByRole("heading", { name: "First entry", exact: true })
				.scrollIntoViewIfNeeded();
			await page.screenshot({
				path: testInfo.outputPath("run-checkpoint.png"),
			});
			expect(aggregates).toBe(1);
			expect(details).toBe(1);
			await sheet
				.getByLabel("Run location", { exact: true })
				.selectOption("town");
			const purchases = sheet.getByText(
				"town potions · Healing potion: 2 for 30 gold",
				{ exact: true },
			);
			await purchases.scrollIntoViewIfNeeded();
			await expect(purchases).toBeVisible();
			await page.screenshot({ path: testInfo.outputPath("run-economy.png") });
			await sheet
				.getByRole("heading", { name: "Terminal snapshot", exact: true })
				.evaluate((node) => node.scrollIntoView({ block: "start" }));
			await page.screenshot({ path: testInfo.outputPath("run-terminal.png") });
			expect(
				await sheet.evaluate((node) => node.scrollWidth <= node.clientWidth),
			).toBe(true);
			expect(details).toBe(1);
			await sheet
				.getByRole("button", { name: "Close run detail", exact: true })
				.click();
			await sheet
				.getByRole("tab", { name: "Floor progression", exact: true })
				.click();
			const floorSelect = sheet.getByLabel("Selected floor", { exact: true });
			await floorSelect.focus();
			await page.keyboard.press("2");
			await page.keyboard.press("Enter");
			await floorSelect.selectOption("2");
			await expect(
				sheet.getByRole("heading", { name: "Floor 2 detail", exact: true }),
			).toBeVisible();
			await sheet
				.getByLabel("Progression metric", { exact: true })
				.selectOption("manaPercent");
			await sheet
				.getByText("Progression values and samples", { exact: true })
				.focus();
			await page.keyboard.press("Enter");
			await expect(
				sheet.getByRole("table", {
					name: "First-entry Mana (% max) by floor",
					exact: true,
				}),
			).toBeVisible();
			expect(aggregates).toBe(1);
			expect(details).toBe(1);
			expect(
				await sheet.evaluate((node) => node.scrollWidth <= node.clientWidth),
			).toBe(true);
			await page.screenshot({ path: testInfo.outputPath("progression.png") });
			await sheet.getByRole("button", { name: /^Select floor 20:/ }).click();
			await expect(
				sheet.getByRole("heading", { name: "Floor 20 detail", exact: true }),
			).toBeVisible();
			await sheet
				.getByRole("heading", { name: "Floor 20 detail", exact: true })
				.scrollIntoViewIfNeeded();
			await page.screenshot({ path: testInfo.outputPath("floor-detail.png") });
			await sheet
				.getByRole("heading", { name: "Damage received", exact: true })
				.scrollIntoViewIfNeeded();
			await page.screenshot({
				path: testInfo.outputPath("floor-counters.png"),
			});
			const floorInspect = sheet.getByRole("button", {
				name: "Inspect floor 20 run 1",
				exact: true,
			});
			await floorInspect.click();
			await expect(
				sheet.getByRole("heading", {
					name: "Run detail · Seed 1",
					exact: true,
				}),
			).toBeFocused();
			expect(details).toBe(2);
			expect(aggregates).toBe(1);
			await sheet
				.getByRole("button", { name: "Close run detail", exact: true })
				.click();
			await expect(floorInspect).toBeFocused();
			await sheet.getByRole("tab", { name: "Overview", exact: true }).click();
			await sheet
				.getByRole("tab", {
					name: "Equipment, spells and consumables",
					exact: true,
				})
				.click();
			await sheet.getByLabel("Find kind", { exact: true }).fill("short sword");
			await expect(
				sheet.getByRole("row", { name: /Short sword/ }),
			).toContainText("50% · 1/2");
			await expect(
				sheet.getByRole("row", { name: /Short sword/ }),
			).toContainText("1 unused");
			await expect(
				sheet.getByRole("row", { name: /Short sword/ }),
			).toContainText("1 unknown");
			expect(
				await sheet.evaluate((node) => node.scrollWidth <= node.clientWidth),
			).toBe(true);
			await sheet
				.getByRole("heading", { name: "Equipment comparisons", exact: true })
				.scrollIntoViewIfNeeded();
			await page.screenshot({ path: testInfo.outputPath("equipment.png") });
			await sheet.getByLabel("Find kind", { exact: true }).fill("");
			await sheet
				.getByLabel("Show comparisons", { exact: true })
				.selectOption("unused");
			await sheet
				.getByLabel("Sort comparisons", { exact: true })
				.selectOption("rate");
			await sheet
				.getByLabel("Sort direction", { exact: true })
				.selectOption("asc");
			await expect(
				sheet.getByRole("row", { name: /Spellguard Shield/ }),
			).toContainText("0% · 0/1");
			await sheet
				.getByLabel("Comparison category", { exact: true })
				.selectOption("spells");
			await expect(sheet.getByRole("row", { name: /Fireball/ })).toContainText(
				"1 unused",
			);
			await sheet
				.getByRole("heading", { name: "Spells comparisons", exact: true })
				.scrollIntoViewIfNeeded();
			await page.screenshot({ path: testInfo.outputPath("spells.png") });
			await sheet
				.getByLabel("Comparison category", { exact: true })
				.selectOption("consumables");
			await expect(
				sheet.getByRole("row", { name: /Enchantment scroll/ }),
			).toContainText("1 unused");
			await sheet
				.getByLabel("Comparison category", { exact: true })
				.selectOption("equipment");
			await sheet
				.getByLabel("Show comparisons", { exact: true })
				.selectOption("all");
			await sheet
				.getByRole("button", { name: "Next kinds", exact: true })
				.click();
			await sheet
				.getByRole("button", { name: "Previous kinds", exact: true })
				.click();
			expect(aggregates).toBe(1);
			expect(details).toBe(2);
			await sheet.getByLabel("Version", { exact: true }).selectOption("all");
			await expect(sheet.getByRole("status")).toContainText("Filters changed");
			expect(aggregates).toBe(1);
			await sheet
				.getByRole("button", { name: "Refresh statistics", exact: true })
				.click();
			await expect(sheet.getByRole("status")).toContainText(
				"mixes game versions",
			);
			expect(aggregates).toBe(2);
			await page.screenshot({ path: testInfo.outputPath("mixed.png") });
			await sheet.getByRole("button", { name: "Close", exact: true }).click();
			await expect(sheet).toHaveCount(0);
		});
	}
test("signed-out startup keeps analytics and Firebase lazy", async ({
	page,
}) => {
	const requests: string[] = [];
	page.on("request", (r) => requests.push(r.url()));
	await page.goto("/");
	await expect(
		page.getByRole("button", { name: "Begin Adventure", exact: true }),
	).toBeVisible();
	expect(
		requests.filter((url) =>
			/DeveloperStatisticsPage-|FirebaseAccounts-|developer-statistics\?/.test(
				url,
			),
		),
	).toEqual([]);
});
