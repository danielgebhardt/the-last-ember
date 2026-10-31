import {
	render as renderUI,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { type ComponentProps, cloneElement, type ReactElement } from "react";
import { expect, vi } from "vitest";
import * as DungeonRun from "../domain/dungeon/DungeonRun.ts";
import type { Coordinate, Dungeon } from "../domain/dungeon/DungeonTypes.ts";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import * as CombatRandomness from "../domain/game/CombatRandomness";
import * as CurePlacement from "../domain/items/CurePlacement";
import * as ExitScrollPlacement from "../domain/items/ExitScrollPlacement";
import type { FloorItem } from "../domain/items/FloorItems";
import * as ItemPlacement from "../domain/items/ItemPlacement";
import * as MonsterDrops from "../domain/items/MonsterDrops";
import * as SpellbookPlacement from "../domain/items/SpellbookPlacement";
import type { Monster } from "../domain/monsters/Monster.ts";
import * as MonsterPlacement from "../domain/monsters/MonsterPlacement.ts";
import * as ObjectPlacement from "../domain/objects/ObjectPlacement";
import type Home from "../Home.tsx";
import { ThemeProvider } from "../settings/ThemeProvider.tsx";
import { predictableAttackRolls } from "./ControlledCombatTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";
import { findFloorPath } from "./testhelpers.ts";

const {
	floorCount,
	difficulty: _difficulty,
	...DEFAULT_DUNGEON_CONFIG
} = COMPACT_TEST_CONFIGURATION;

export { DEFAULT_DUNGEON_CONFIG };

// These existing suites inspect the complete map. Fog-specific suites render
// Home directly to exercise its enabled default and discovery behavior.
export const renderHome = (ui: ReactElement<ComponentProps<typeof Home>>) => {
	// These page scenarios isolate controls/ownership/turn rules with landed nominal hits.
	vi.spyOn(CombatRandomness, "createAttackRolls").mockImplementation(
		predictableAttackRolls,
	);
	// Legacy page scenarios exercise exploration without monster occupancy.
	vi.spyOn(CurePlacement, "spawnRunQuestItems").mockReturnValue([]);
	vi.spyOn(MonsterPlacement, "spawnRunMonsters").mockReturnValue([]);
	vi.spyOn(ItemPlacement, "spawnRunItems").mockReturnValue([]);
	vi.spyOn(ExitScrollPlacement, "spawnRunExitScrolls").mockReturnValue([]);
	vi.spyOn(SpellbookPlacement, "spawnRunSpellbooks").mockReturnValue([]);
	vi.spyOn(ObjectPlacement, "spawnRunObjects").mockReturnValue([]);
	return renderUI(
		cloneElement(ui, {
			initialFogConfiguration: { ...DEFAULT_FOG_CONFIGURATION, enabled: false },
		}),
		{ wrapper: ThemeProvider },
	);
};

export const resetHomeTestState = () => {
	localStorage.clear();
	document.documentElement.classList.remove("dark");
	document.documentElement.style.removeProperty("color-scheme");
	vi.restoreAllMocks();
};

export const openSaveSheet = async (
	user: ReturnType<typeof userEvent.setup>,
) => {
	await user.click(screen.getByRole("button", { name: "Save/Load" }));
	return screen.findByRole("dialog", { name: "Save/Load" });
};
export const closeSaveSheet = async (
	user: ReturnType<typeof userEvent.setup>,
) => {
	await user.keyboard("{Escape}");
	await waitFor(() =>
		expect(
			screen.queryByRole("dialog", { name: "Save/Load" }),
		).not.toBeInTheDocument(),
	);
};

export const openSettings = async (
	user: ReturnType<typeof userEvent.setup>,
) => {
	await user.click(screen.getByRole("button", { name: "Settings" }));
	return screen.findByRole("dialog", { name: "Settings" });
};

// New Dungeon → Custom, where a seed, size, difficulty and sight are chosen.
export const openCustomAdventure = async (
	user: ReturnType<typeof userEvent.setup>,
) => {
	await user.click(screen.getByRole("button", { name: "New Dungeon" }));
	await screen.findByRole("dialog", { name: "New adventure" });
	await user.click(screen.getByRole("tab", { name: "Custom" }));
	return screen.getByRole("textbox", { name: "Dungeon seed" });
};

export const waitForNewAdventureClosed = () =>
	waitFor(() => {
		expect(
			screen.queryByRole("dialog", { name: "New adventure" }),
		).not.toBeInTheDocument();
	});

export const closeNewAdventure = async (
	user: ReturnType<typeof userEvent.setup>,
) => {
	await user.keyboard("{Escape}");
	await waitForNewAdventureClosed();
};

export const waitForSettingsClosed = () =>
	waitFor(() => {
		expect(
			screen.queryByRole("dialog", { name: "Settings" }),
		).not.toBeInTheDocument();
	});

export const closeSettings = async (
	user: ReturnType<typeof userEvent.setup>,
) => {
	await user.keyboard("{Escape}");
	await waitForSettingsClosed();
};

export const editConfiguration = async (
	user: ReturnType<typeof userEvent.setup>,
	{ rows, columns, floors }: { rows: string; columns: string; floors: string },
) => {
	for (const [name, value] of [
		["Rows", rows],
		["Columns", columns],
		["Floors", floors],
	]) {
		const input = screen.getByRole("textbox", { name });
		await user.clear(input);
		await user.type(input, value);
	}
};

// Compare the displayed tile identities rather than SVG markup or CSS classes.
export const readDungeonCells = (
	board: HTMLElement = screen.getByRole("table", { name: "Dungeon" }),
) =>
	Array.from(board.querySelectorAll("tr"), (row) =>
		Array.from(row.querySelectorAll("td"), (cell) =>
			cell.getAttribute("aria-label"),
		),
	);

export const movementKeysTo = (
	terrain: Dungeon,
	start: Coordinate,
	target: Coordinate,
): string => {
	const path = findFloorPath(terrain, start, target);
	return path
		.slice(1)
		.map((coordinate, index) => {
			const previous = path[index];
			if (coordinate.row < previous.row) return "{ArrowUp}";
			if (coordinate.row > previous.row) return "{ArrowDown}";
			if (coordinate.col < previous.col) return "{ArrowLeft}";
			return "{ArrowRight}";
		})
		.join("");
};

export const stubDungeonRun = (
	run: DungeonRun.DungeonRun,
	monsters: readonly Monster[] = [],
	floorItems: readonly FloorItem[] = [],
) => ({
	exitScrolls: vi
		.spyOn(ExitScrollPlacement, "spawnRunExitScrolls")
		.mockReturnValue([]),
	objects: vi.spyOn(ObjectPlacement, "spawnRunObjects").mockReturnValue([]),
	books: vi.spyOn(SpellbookPlacement, "spawnRunSpellbooks").mockReturnValue([]),
	questItems: vi.spyOn(CurePlacement, "spawnRunQuestItems").mockReturnValue([]),
	rolls: vi
		.spyOn(CombatRandomness, "createAttackRolls")
		.mockImplementation(predictableAttackRolls),
	drops: vi.spyOn(MonsterDrops, "createMonsterDrop").mockReturnValue(undefined),
	items: vi.spyOn(ItemPlacement, "spawnRunItems").mockReturnValue(floorItems),
	spawn: vi
		.spyOn(MonsterPlacement, "spawnRunMonsters")
		.mockReturnValue(monsters),
	generate: vi.spyOn(DungeonRun, "generateDungeonRun").mockReturnValue(run),
	connect: vi.spyOn(DungeonRun, "connectDungeonFloors").mockReturnValue(run),
});

export const inspectEndedRun = async (
	user: ReturnType<typeof userEvent.setup>,
) => {
	const dialog = await screen.findByRole("dialog", { name: "You died" });
	await user.click(within(dialog).getByRole("button", { name: "Inspect run" }));
	await waitFor(() =>
		expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus(),
	);
};

// Fresh/replayed adventures begin in town; dungeon-focused scenarios explicitly depart.
export const enterDungeonFromTown = async (
	user: ReturnType<typeof userEvent.setup>,
) => {
	const town = screen.getByLabelText("Town map", { exact: true });
	expect(town).toHaveFocus();
	await user.keyboard("ss{Enter}");
	expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus();
};
