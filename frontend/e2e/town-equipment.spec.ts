import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

for (const store of ["armor", "weapons"]) {
	for (const width of [1280, 1440]) {
		for (const theme of ["Light", "Dark"]) {
			test(`${store} store ${width}px ${theme}: compare, confirm, own and restore a finite plain copy`, async ({
				page,
			}, info) => {
				await page.setViewportSize({
					width,
					height: width === 1280 ? 800 : 900,
				});
				await page.goto("/");
				await page
					.getByRole("button", { name: "Load an existing save", exact: true })
					.click();
				await page
					.getByLabel("Import adventure file")
					.setInputFiles(
						fileURLToPath(
							new URL(`.generated/town-${store}.json`, import.meta.url),
						),
					);
				const map = page.getByLabel("Town map", { exact: true });
				await expect(map).toBeFocused();
				await page
					.getByRole("button", { name: "Settings", exact: true })
					.click();
				await page.getByRole("button", { name: theme, exact: true }).click();
				await page.keyboard.press("Escape");
				await expect(map).toBeFocused();
				await page.keyboard.press("e");
				const name = store === "armor" ? "armor" : "weapon";
				const dialog = page.getByRole("dialog", {
					name: `Town ${name} store`,
					exact: true,
				});
				await expect(dialog).toBeVisible();
				const itemName = store === "armor" ? "Chain armor" : "Steel sword";
				const card = dialog.getByRole("listitem").filter({
					has: page.getByRole("heading", { name: itemName, exact: true }),
				});
				await expect(
					card.getByLabel("Equipment comparison", { exact: true }),
				).toContainText("Damage");
				await card
					.getByRole("button", { name: new RegExp(`^Buy ${itemName}`) })
					.click();
				await dialog
					.getByRole("button", { name: "Cancel purchase", exact: true })
					.click();
				await expect(
					dialog.getByText("Gold: 5000", { exact: true }),
				).toBeVisible();
				await card
					.getByRole("button", { name: new RegExp(`^Buy ${itemName}`) })
					.click();
				await dialog
					.getByRole("button", { name: "Confirm purchase", exact: true })
					.dblclick();
				const price = store === "armor" ? 500 : 700;
				await expect(
					dialog.getByText(`Gold: ${5000 - price}`, { exact: true }),
				).toBeVisible();
				await expect(
					card.getByRole("button", { name: new RegExp(`^Buy ${itemName}`) }),
				).toBeDisabled();
				await card.scrollIntoViewIfNeeded();
				await page.screenshot({
					path: info.outputPath(`${store}-${width}-${theme}.png`),
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
				const bought = saved.state.bag.items.find((item: { id: string }) =>
					item.id.startsWith(`town-gear:${store}:`),
				);
				expect(bought.enchantment).toBeUndefined();
				expect(
					saved.state.townEquipmentStock.some(
						(item: { id: string }) => item.id === bought.id,
					),
				).toBe(false);
				expect(
					Object.values(saved.state.equipment).some(
						(item) => (item as { id: string } | null)?.id === bought.id,
					),
				).toBe(false);
				expect(saved.state.turn).toBe(0);
				expect(saved.state.player.health).toBe(1);
				await page.keyboard.press("Escape");
				await expect(map).toBeFocused();
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
					card.getByRole("button", { name: new RegExp(`^Buy ${itemName}`) }),
				).toBeDisabled();
			});
		}
	}
}
