import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

for (const width of [390, 1440])
	for (const theme of ["Light", "Dark"]) {
		test(`town potion store ${width}px ${theme}: confirmed purchase and saved depletion without recovery`, async ({
			page,
		}, info) => {
			await page.setViewportSize({ width, height: width === 390 ? 740 : 900 });
			await page.goto("/");
			await page
				.getByRole("button", { name: "Load an existing save", exact: true })
				.click();
			await page
				.getByLabel("Import adventure file")
				.setInputFiles(
					fileURLToPath(
						new URL(".generated/town-potions.json", import.meta.url),
					),
				);
			const map = page.getByLabel("Town map", { exact: true });
			await expect(map).toBeFocused();
			await page.getByRole("button", { name: "Settings", exact: true }).click();
			await page.getByRole("button", { name: theme, exact: true }).click();
			await page.keyboard.press("Escape");
			await expect(map).toBeFocused();
			if (width === 390)
				await map
					.getByRole("button", { name: "Inspect Potion store", exact: true })
					.click();
			else await page.keyboard.press("e");
			const store = page.getByRole("dialog", { name: "Town potion store" });
			await expect(store).toBeVisible();
			await expect(store.getByRole("listitem")).toHaveCount(8);
			await store
				.getByRole("button", { name: "Buy Healing potion", exact: true })
				.click();
			await store
				.getByRole("button", { name: "Cancel purchase", exact: true })
				.click();
			await expect(
				store.getByText("Gold: 1000", { exact: true }),
			).toBeVisible();
			await store
				.getByRole("button", { name: "Buy Healing potion", exact: true })
				.click();
			await store
				.getByRole("button", { name: "Confirm purchase", exact: true })
				.dblclick();
			await expect(store.getByText("Gold: 850", { exact: true })).toBeVisible();
			await expect(
				store.getByText("150 gold · 3 remaining", { exact: true }),
			).toBeVisible();
			await expect(
				store.getByRole("button", { name: "Confirm purchase", exact: true }),
			).toBeHidden();
			await expect(
				store.getByRole("button", { name: "Leave potion store", exact: true }),
			).toBeInViewport();
			await page.screenshot({
				path: info.outputPath(`potions-${width}-${theme}.png`),
			});
			await page.keyboard.press("Escape");
			await expect(map).toBeFocused();
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
			expect(saved.version).toBe(26);
			expect(saved.state.townPotionStock["healing-potion"]).toBe(3);
			expect(saved.state.gold).toBe(850);
			expect(saved.state.turn).toBe(0);
			expect(saved.state.player.health).toBe(1);
			expect(saved.state.effects).toEqual([
				{
					actorId: "player",
					floorNumber: null,
					kind: "poisoned",
					remaining: 3,
				},
			]);
			expect(saved.state.bag.items).toEqual([
				{ id: "town-potion:healing-potion:1", kind: "healing-potion" },
			]);
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
			await expect(
				store.getByText("150 gold · 3 remaining", { exact: true }),
			).toBeVisible();
			expect(
				await store.evaluate(
					(element) => element.scrollWidth <= element.clientWidth + 1,
				),
			).toBe(true);
		});
	}
