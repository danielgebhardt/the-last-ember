import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createAdventureSession } from "../components/game/useAdventureSession";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import type { ActiveAffliction } from "../domain/game/AfflictionDefinitions";
import { createBag } from "../domain/items/Bag";
import type { ItemInstance } from "../domain/items/Item";
import { createTownLocation } from "../domain/town/TownLocation";
import Home from "../Home";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState } from "./HomeTestHelpers";
import { COMPACT_TEST_CONFIGURATION as config } from "./TestRunConfiguration";

const kit: ItemInstance[] = [
	{ id: "antidote:1", kind: "antidote" },
	{ id: "antidote:2", kind: "antidote" },
	{ id: "bandages", kind: "bandages" },
	{ id: "curse", kind: "remove-curse-scroll" },
	{ id: "heal", kind: "healing-potion" },
];
const poisoned: ActiveAffliction = {
	kind: "poisoned",
	remaining: 5,
	source: "test",
};

const setup = ({
	items = kit,
	afflictions = [poisoned],
	town = false,
	adjacentMonster = false,
}: {
	items?: ItemInstance[];
	afflictions?: ActiveAffliction[];
	town?: boolean;
	adjacentMonster?: boolean;
} = {}) => {
	const initial = createAdventureSession(123, config, {
		...DEFAULT_FOG_CONFIGURATION,
		enabled: false,
	});
	const entrance = initial.state.quest.entrance;
	const monster = initial.state.monsters.find((m) => m.floorNumber === 1);
	const adjacent = [
		{ row: entrance.row - 1, col: entrance.col },
		{ row: entrance.row + 1, col: entrance.col },
		{ row: entrance.row, col: entrance.col - 1 },
		{ row: entrance.row, col: entrance.col + 1 },
	].find((c) => initial.state.run.floors[0].terrain[c.row]?.[c.col] === ".");
	if (adjacentMonster && (!monster || !adjacent))
		throw new Error("Expected a floor-1 monster beside the entrance");
	const state = {
		...initial.state,
		town: town ? createTownLocation() : null,
		bag: createBag(items),
		afflictions,
		monsters:
			adjacentMonster && monster && adjacent
				? [{ ...monster, coordinate: adjacent }]
				: [],
	};
	render(<Home initialAdventure={{ ...initial, state }} />, {
		wrapper: ThemeProvider,
	});
	screen
		.getByLabelText(town ? "Town map" : "Dungeon map", { exact: true })
		.focus();
	return userEvent.setup();
};
const remediesButton = () => screen.getByRole("button", { name: /^Remedies/ });
const menu = async () =>
	within(await screen.findByRole("dialog", { name: "Remedies" }));
const turn = () => screen.getByLabelText("Turn count");

afterEach(resetHomeTestState);
describe("Remedies button", () => {
	it("opens with P, lists carried remedies with active cures first, and disables the rest", async () => {
		const user = setup();
		expect(remediesButton()).toHaveAccessibleName("Remedies, cure available");
		expect(remediesButton()).toHaveAttribute("aria-keyshortcuts", "P");
		await user.keyboard("p");
		const list = await menu();
		const rows = list.getAllByRole("button");
		expect(rows.map((row) => row.textContent)).toEqual([
			expect.stringMatching(/^\dAntidote.*Cures your Poison.*×2$/),
			expect.stringMatching(/^\dBandages.*Cures Bleeding.*×1$/),
			expect.stringMatching(/^\dRemove Curse scroll.*Cures Curse.*×1$/),
		]);
		expect(rows.map((row) => (row as HTMLButtonElement).disabled)).toEqual([
			false,
			true,
			true,
		]);
		expect(list.queryByText(/Healing potion/)).not.toBeInTheDocument();
	});

	it("uses a remedy by number like from the bag, then closes and returns to the map", async () => {
		const user = setup();
		await user.keyboard("p");
		await menu();
		await user.keyboard("2");
		expect(turn()).toHaveTextContent("Turn 0");
		await user.keyboard("1");
		await waitFor(() =>
			expect(screen.queryByRole("dialog", { name: "Remedies" })).toBeNull(),
		);
		expect(turn()).toHaveTextContent("Turn 1");
		expect(screen.getByRole("log").textContent).toMatch(/Antidote/);
		expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus();
		expect(remediesButton()).toHaveAccessibleName("Remedies");
	});

	it("uses a remedy by click", async () => {
		const user = setup({
			afflictions: [{ kind: "bleeding", remaining: 3, source: "test" }],
		});
		await user.click(remediesButton());
		const list = await menu();
		await user.click(list.getByRole("button", { name: /^Bandages/ }));
		expect(turn()).toHaveTextContent("Turn 1");
		expect(screen.getByRole("log").textContent).toMatch(/Bandages/);
		await user.click(remediesButton());
		expect(
			(await menu()).queryByRole("button", { name: /^Bandages/ }),
		).not.toBeInTheDocument();
	});

	it("has no cure signal without an active affliction, and explains an empty kit", async () => {
		const user = setup({
			items: [{ id: "heal", kind: "healing-potion" }],
			afflictions: [],
		});
		expect(remediesButton()).toHaveAccessibleName("Remedies");
		await user.keyboard("p");
		expect((await menu()).getByText(/You carry no remedies/)).toBeVisible();
	});

	it("is disabled in town", async () => {
		const user = setup({ town: true });
		expect(remediesButton()).toBeDisabled();
		await user.keyboard("p");
		expect(screen.queryByRole("dialog", { name: "Remedies" })).toBeNull();
	});

	it("is disabled while targeting a spell, and P does not open it", async () => {
		const user = setup({ adjacentMonster: true });
		await user.keyboard("z");
		expect(screen.getByLabelText("Spell targeting")).toBeVisible();
		expect(remediesButton()).toBeDisabled();
		await user.keyboard("p");
		expect(screen.queryByRole("dialog", { name: "Remedies" })).toBeNull();
		await user.keyboard("{Escape}");
		expect(remediesButton()).toBeEnabled();
	});
});
