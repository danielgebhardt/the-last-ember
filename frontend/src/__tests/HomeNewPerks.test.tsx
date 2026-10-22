import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { createAdventureSession } from "../components/game/useAdventureSession";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { PERK_LEVELS, type PerkKind } from "../domain/game/Perks";
import { maximumHealth } from "../domain/game/PlayerHealth";
import { SPELL_DEFINITIONS } from "../domain/game/Spells";
import Home from "../Home";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState } from "./HomeTestHelpers";
import { COMPACT_TEST_CONFIGURATION as config } from "./TestRunConfiguration";

const play = (...perks: PerkKind[]) => {
	// Sight radius 1, so the stairs down start out unseen.
	const initial = createAdventureSession(123, config, {
		...DEFAULT_FOG_CONFIGURATION,
		radius: 1,
	});
	const progression = {
		...initial.state.progression,
		experience: 3800,
		perks: perks.map((perk, index) => ({ level: PERK_LEVELS[index], perk })),
	};
	const maxHealth = maximumHealth(progression, initial.state.equipment);
	const state = {
		...initial.state,
		town: null,
		monsters: [],
		progression,
		player: { health: maxHealth, maxHealth },
	};
	render(<Home initialAdventure={{ ...initial, state }} />, {
		wrapper: ThemeProvider,
	});
	const stair = state.run.floors[0].downStair?.coordinate;
	if (!stair) throw new Error("Expected stairs down on floor 1");
	return {
		user: userEvent.setup(),
		stairCell: () =>
			screen.getByRole("cell", {
				name: new RegExp(`^row${stair.row}col${stair.col}( |$)`),
			}),
	};
};
afterEach(resetHomeTestState);

it("Pathfinder marks the unexplored stairs down under fog", () => {
	const { stairCell } = play("pathfinder");
	expect(stairCell()).toHaveAttribute("data-visibility", "remembered");
	expect(stairCell()).toHaveAccessibleName(/stairs down/i);
});

it("without Pathfinder, unexplored stairs stay hidden", () => {
	const { stairCell } = play();
	expect(stairCell()).toHaveAttribute("data-visibility", "unknown");
});

it("shows the perk-adjusted spell cost on the hotbar and the perk attack in Character", async () => {
	const { user } = play("efficient-casting", "reckless");
	const missile = SPELL_DEFINITIONS["magic-missile"];
	expect(
		screen.getByRole("button", {
			name: new RegExp(`^Magic Missile, ${missile.cost - 1} mana`),
		}),
	).toBeVisible();
	await user.keyboard("c");
	const ledger = within(
		await screen.findByRole("dialog", { name: "The Adventurer's Ledger" }),
	);
	expect(ledger.getByText(/\+ perks 2/)).toBeVisible();
});

it("quotes the perk-adjusted starting spell costs and range in Help", async () => {
	const { user } = play("efficient-casting", "long-reach");
	const missile = SPELL_DEFINITIONS["magic-missile"];
	await user.click(screen.getByRole("button", { name: "Help" }));
	const help = within(await screen.findByRole("dialog", { name: /Help/ }));
	expect(
		help.getByText(
			new RegExp(
				`Magic Missile \\(${missile.cost - 1} mana\\).*within ${missile.range + 1} tiles`,
			),
		),
	).toBeVisible();
	expect(
		help.getByText(
			new RegExp(`^Heal \\(${SPELL_DEFINITIONS.heal.cost - 1} mana\\)`),
		),
	).toBeVisible();
});
