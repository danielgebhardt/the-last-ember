import { expect, test } from "@playwright/test";
import { importAdventure, saveSheet, turns } from "./adventure-helpers.js";

for (const width of [1280, 1440])
	test(`Town forge ${width}px: reforge the worn sword, keep the dialog still, save and load`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: width === 1280 ? 800 : 900 });
		await page.goto("/");
		await importAdventure(page, "town-forge");
		const townMap = page.getByLabel("Town map", { exact: true });
		await page.keyboard.press("e");
		const forge = page.getByRole("dialog", { name: "Town forge" });
		await expect(forge).toContainText("Gold: 500");
		const size = async () => {
			const box = await forge.boundingBox();
			return box && { width: box.width, height: box.height };
		};
		const initial = await size();
		for (const tab of ["Weapons", "Body armor", "Helmets", "Shields"]) {
			await forge.getByRole("tab", { name: tab, exact: true }).click();
			expect(await size()).toEqual(initial);
		}
		await forge.getByRole("tab", { name: "Equipped", exact: true }).click();
		await forge
			.getByRole("button", { name: "Reforge Short sword", exact: true })
			.click();
		const confirm = forge.getByRole("group", { name: "Confirm reforging" });
		await expect(confirm).toBeFocused();
		await expect(confirm).toContainText(
			"Reforge Short sword to +1 for 150 gold?",
		);
		await confirm
			.getByRole("button", { name: "Confirm reforging", exact: true })
			.click();
		await expect(forge).toContainText("Gold: 350");
		await expect(
			forge.getByRole("button", {
				name: "Reforge Short sword +1",
				exact: true,
			}),
		).toBeEnabled();
		await forge
			.getByRole("button", { name: "Leave forge", exact: true })
			.click();
		await expect(townMap).toBeFocused();
		await expect(turns(page)).toHaveText("Turn 0");

		await page.getByRole("button", { name: "Save/Load", exact: true }).click();
		await saveSheet(page)
			.getByRole("button", { name: "Save adventure", exact: true })
			.click();
		await page
			.getByRole("button", { name: "Confirm save", exact: true })
			.click();
		await saveSheet(page)
			.getByRole("button", { name: "Load adventure", exact: true })
			.click();
		await page
			.getByRole("button", { name: "Confirm load", exact: true })
			.click();
		await expect(townMap).toBeFocused();
		await page.keyboard.press("e");
		await expect(forge).toContainText("Gold: 350");
		await expect(forge).toContainText("Short sword +1");
	});

test("Town library: learn one seeded book for 1000 gold, then save/load keeps it known", async ({
	page,
}) => {
	await page.goto("/");
	await importAdventure(page, "town-library");
	const townMap = page.getByLabel("Town map", { exact: true });
	await page.keyboard.press("e");
	const library = page.getByRole("dialog", { name: "Library" });
	await expect(library).toContainText("Gold: 1200");
	await expect(library.getByRole("listitem")).toHaveCount(3);
	const learn = library.getByRole("button", { name: /^Learn / }).first();
	const spell = (await learn.textContent())?.replace("Learn ", "") ?? "";
	await learn.click();
	const confirm = library.getByRole("group", {
		name: "Confirm spellbook purchase",
	});
	await expect(confirm).toBeFocused();
	await confirm
		.getByRole("button", { name: "Confirm purchase", exact: true })
		.click();
	await expect(library).toContainText("Gold: 200");
	await expect(
		library.getByRole("button", { name: `${spell} (Already known)` }),
	).toBeDisabled();
	await library
		.getByRole("button", { name: "Leave library", exact: true })
		.click();
	await expect(townMap).toBeFocused();
	await expect(turns(page)).toHaveText("Turn 0");

	await page.getByRole("button", { name: "Save/Load", exact: true }).click();
	await saveSheet(page)
		.getByRole("button", { name: "Save adventure", exact: true })
		.click();
	await page.getByRole("button", { name: "Confirm save", exact: true }).click();
	await saveSheet(page)
		.getByRole("button", { name: "Load adventure", exact: true })
		.click();
	await page.getByRole("button", { name: "Confirm load", exact: true }).click();
	await expect(townMap).toBeFocused();
	await page.keyboard.press("e");
	await expect(
		library.getByRole("button", { name: `${spell} (Already known)` }),
	).toBeDisabled();
});
