import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PotionHotbarView from "../components/game/PotionHotbarView";
import SpellHotbarView from "../components/game/SpellHotbarView";
import { createBag } from "../domain/items/Bag";

describe("Visible hotbar labels", () => {
	it("labels the sixth spell key as 0 and clicking it activates that spell", async () => {
		const activate = vi.fn();
		render(
			<SpellHotbarView
				progression={{ experience: 0 }}
				knownSpells={["heal"]}
				slots={[null, null, null, null, null, "heal"]}
				enabled
				onActivate={activate}
			/>,
		);
		const button = screen.getByRole("button", { name: "Heal, 4 mana" });
		expect(button).toHaveAttribute("aria-keyshortcuts", "0");
		expect(within(button).getByText("0", { selector: "kbd" })).toBeVisible();
		await userEvent.setup().click(button);
		expect(activate).toHaveBeenCalledExactlyOnceWith("heal");
	});
	it("identifies potion kinds while keeping key numbers and carried counts", () => {
		render(
			<PotionHotbarView
				bag={createBag([
					{ id: "heal:1", kind: "healing-potion" },
					{ id: "heal:2", kind: "healing-potion" },
				])}
				potionHotbar={[
					"healing-potion",
					"greater-mana-potion",
					"antidote",
					null,
				]}
				alive
				onActivate={vi.fn()}
			/>,
		);
		const bar = within(screen.getByRole("region", { name: "Potion hotbar" }));
		for (const name of ["Health", "Greater mana", "Antidote"])
			expect(bar.getByText(name)).toBeVisible();
		expect(
			bar.getByRole("button", {
				name: "Potion slot 1: Healing potion, 2 carried",
			}),
		).toBeVisible();
		expect(bar.getByText("1", { selector: "kbd" })).toBeVisible();
	});
	it("shows assigned spell names alongside their key and mana cost", () => {
		render(
			<SpellHotbarView
				progression={{ experience: 0 }}
				knownSpells={["magic-missile", "heal", "sonic-spear"]}
				slots={["magic-missile", "heal", "sonic-spear", null, null, null]}
				enabled
				onActivate={vi.fn()}
			/>,
		);
		const bar = within(screen.getByRole("region", { name: "Spell hotbar" }));
		for (const name of ["Magic Missile", "Heal", "Sonic Spear"])
			expect(bar.getByText(name)).toBeVisible();
		expect(
			bar.getByRole("button", { name: "Magic Missile, 3 mana" }),
		).toBeVisible();
		expect(bar.getByText("5", { selector: "kbd" })).toBeVisible();
	});
});
