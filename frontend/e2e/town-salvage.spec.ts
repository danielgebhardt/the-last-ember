import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

for (const width of [1280, 1440]) {
	for (const theme of ["Light", "Dark"]) {
		test(`The Rag & Bone ${width}px ${theme}: sell-only, stable copies, bulk confirmation and saved ownership`, async ({
			page,
		}, info) => {
			await page.setViewportSize({ width, height: width === 1280 ? 800 : 900 });
			await page.goto("/");
			await page
				.getByRole("button", { name: "Load an existing save", exact: true })
				.click();
			await page
				.getByLabel("Import adventure file")
				.setInputFiles(
					fileURLToPath(
						new URL(".generated/town-rag-and-bone.json", import.meta.url),
					),
				);
			const map = page.getByLabel("Town map", { exact: true });
			await expect(map).toBeFocused();
			await page.getByRole("button", { name: "Settings", exact: true }).click();
			await page.getByRole("button", { name: theme, exact: true }).click();
			await page.keyboard.press("Escape");
			await expect(map).toBeFocused();
			await page.keyboard.press("e");
			const shop = page.getByRole("dialog", {
				name: "The Rag & Bone",
				exact: true,
			});
			await expect(shop).toBeVisible();
			await expect(
				shop.getByRole("tab", { name: "Buy", exact: true }),
			).toHaveCount(0);
			await expect(
				shop.getByRole("tab", { name: "Sell", exact: true }),
			).toHaveAttribute("aria-selected", "true");
			await page.keyboard.type("b1234");
			await expect(shop.getByText("Gold 700", { exact: true })).toBeVisible();
			const next = shop.getByRole("button", {
				name: "Short sword · Sell for 20 gold",
				exact: true,
			});
			const before = await next.boundingBox();
			await shop
				.getByRole("button", {
					name: "Short sword +1 · Sell for 25 gold",
					exact: true,
				})
				.dblclick();
			await expect(shop.getByText("Gold 725", { exact: true })).toBeVisible();
			await expect(
				shop.getByText("Sold: Short sword +1", { exact: true }),
			).toBeVisible();
			const after = await next.boundingBox();
			if (!before || !after)
				throw new Error("Expected stable sale item bounds");
			expect(Math.abs(after.y - before.y)).toBeLessThan(2);
			await shop
				.getByRole("button", { name: /Sell all Lower items \(1\)/ })
				.click();
			await expect(
				shop.getByRole("group", {
					name: "Confirm Lower equipment sale",
					exact: true,
				}),
			).toContainText("free of dungeon time");
			await shop
				.getByRole("button", { name: "Cancel bulk sale", exact: true })
				.click();
			await expect(shop.getByText("Gold 725", { exact: true })).toBeVisible();
			await shop
				.getByRole("button", { name: /Sell all Lower items \(1\)/ })
				.click();
			await shop
				.getByRole("button", { name: "Confirm bulk sale", exact: true })
				.click();
			await expect(shop.getByText("Gold 745", { exact: true })).toBeVisible();
			await expect(
				shop.getByRole("button", { name: /Sell all Lower items \(0\)/ }),
			).toBeDisabled();
			await expect(
				shop.getByRole("button", { name: /Iron sword \+1 · Sell/ }),
			).toBeVisible();
			await expect(
				shop.getByRole("button", { name: /Short sword \+3 · Sell/ }),
			).toBeVisible();
			await expect(
				shop.getByRole("button", { name: /Scholar robe · Sell/ }),
			).toBeVisible();
			await expect(
				shop.getByRole("button", { name: /Healing potion.*Sell/ }),
			).toHaveCount(0);
			await page.screenshot({
				path: info.outputPath(`rag-and-bone-${width}-${theme}.png`),
			});
			await page.keyboard.press("Escape");
			await expect(map).toBeFocused();
			await expect(page.getByLabel("Turn count")).toHaveText("Turn 0");
			await page
				.getByRole("button", { name: "Save/Load", exact: true })
				.click();
			await page
				.getByRole("button", { name: "Save adventure", exact: true })
				.click();
			await page
				.getByRole("button", { name: "Confirm save", exact: true })
				.click();
			const saved = await page.evaluate(() =>
				JSON.parse(localStorage.getItem("larn:adventure-save") ?? "null"),
			);
			expect(saved.state.gold).toBe(745);
			expect(saved.state.turn).toBe(0);
			expect(saved.state.mana).toBe(2);
			expect(saved.state.player.health).toBe(1);
			expect(saved.state.afflictions[0].remaining).toBe(3);
			expect(
				saved.state.bag.items.map((item: { id: string }) => item.id),
			).toEqual(["rag:same", "rag:better", "rag:tradeoff", "rag:potion"]);
			await page.reload();
			await page
				.getByRole("button", { name: "Load an existing save", exact: true })
				.click();
			await page
				.getByRole("button", { name: "Load adventure", exact: true })
				.click();
			await page
				.getByRole("button", { name: "Confirm load", exact: true })
				.click();
			await expect(map).toBeFocused();
			await page.keyboard.press("e");
			await expect(shop.getByText("Gold 745", { exact: true })).toBeVisible();
			await expect(
				shop.getByRole("button", { name: /^Short sword · Sell/ }),
			).toHaveCount(0);
		});
	}
}
