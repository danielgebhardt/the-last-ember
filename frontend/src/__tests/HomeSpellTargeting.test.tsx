import {
	fireEvent,
	render as renderUI,
	screen,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DungeonRun } from "../domain/dungeon/DungeonRun";
import * as GameState from "../domain/game/GameState";
import { SPELL_DEFINITIONS } from "../domain/game/Spells";
import { ThemeProvider } from "../settings/ThemeProvider";
import {
	renderHome,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";
import { createTestDungeonFloor } from "./testhelpers";

const setup = (
	overrides: Partial<GameState.GameState> = {},
	run: DungeonRun = createCorridorEncounter(),
) => {
	stubDungeonRun(run);
	const create = GameState.createGameState;
	vi.spyOn(GameState, "createGameState").mockImplementationOnce((run) => ({
		...create(run),
		monsters: [
			{
				intent: { type: "idle" as const },
				id: "1:1",
				kind: "goblin",
				floorNumber: 1,
				coordinate: { row: 1, col: 3 },
				health: 9,
			},
			{
				intent: { type: "idle" as const },
				id: "1:2",
				kind: "giant-rat",
				floorNumber: 1,
				coordinate: { row: 1, col: 5 },
				health: 9,
			},
		],
		...overrides,
	}));
	renderHome(<Home />);
	const map = screen.getByLabelText("Dungeon map", { exact: true });
	map.focus();
	return { map, user: userEvent.setup() };
};
const createOpenEncounter = (): DungeonRun => ({
	seed: 123,
	activeFloor: 1,
	playerCoordinate: { row: 3, col: 3 },
	floors: [
		createTestDungeonFloor({
			floorNumber: 1,
			rows: 7,
			cols: 7,
			room: { startRow: 1, endRow: 5, startCol: 1, endCol: 5 },
		}),
	],
});
afterEach(resetHomeTestState);
describe("Spell targeting controls", () => {
	it("names the spell and target, and says only how to aim", async () => {
		const definition = SPELL_DEFINITIONS["magic-missile"];
		const originalName = definition.name;
		Reflect.set(definition, "name", "Renamed bolt");
		try {
			const { user } = setup();
			await user.keyboard("z");
			expect(screen.getByLabelText("Spell targeting")).toHaveTextContent(
				"Renamed bolt at goblin. Enter or click casts; arrows or WASD cast in a direction. Escape or Z cancels.",
			);
		} finally {
			Reflect.set(definition, "name", originalName);
		}
	});

	it("shows known spells and mana, previews nearest target and casts with Enter without moving", async () => {
		const { user } = setup();
		expect(screen.getByLabelText("Player mana")).toHaveTextContent(
			"Mana 10 / 10",
		);
		expect(
			within(screen.getByRole("region", { name: "Spell hotbar" })).getAllByRole(
				"button",
			),
		).toHaveLength(2);
		await user.keyboard("z");
		expect(
			screen.getByRole("button", { name: "Target goblin at row 1, column 3" }),
		).toHaveAttribute("aria-pressed", "true");
		expect(
			screen.getByRole("button", {
				name: "Potion slot 1: Healing potion, 1 carried",
			}),
		).toBeDisabled();
		expect(screen.getByRole("button", { name: "Heal, 4 mana" })).toBeDisabled();
		await user.keyboard("g 1w");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		await user.keyboard("{Enter}");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
		expect(screen.getByLabelText("Player mana")).toHaveTextContent(
			"Mana 7 / 10",
		);
		expect(
			screen.queryByRole("button", { name: /Target goblin/ }),
		).not.toBeInTheDocument();
	});
	it.each(["z", "{Escape}"])("cancels for free with %s", async (key) => {
		const { user, map } = setup();
		await user.click(
			screen.getByRole("button", { name: /Magic Missile.*3 mana/ }),
		);
		await user.keyboard(key);
		expect(
			screen.queryByRole("button", { name: /Target goblin/ }),
		).not.toBeInTheDocument();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		expect(map).toHaveFocus();
	});
	it("casts by clicking an eligible map target and clears on a new run", async () => {
		const { user } = setup();
		await user.keyboard("z");
		await user.click(
			screen.getByRole("button", { name: "Target goblin at row 1, column 3" }),
		);
		expect(screen.getByRole("log")).toHaveTextContent(
			"Magic Missile hits the goblin for 4 damage",
		);
		await user.keyboard("z");
		await user.click(screen.getByRole("button", { name: "New Dungeon" }));
		await user.click(screen.getByRole("button", { name: "Start new dungeon" }));
		expect(
			screen.queryByRole("button", { name: /Target goblin/ }),
		).not.toBeInTheDocument();
		expect(screen.getByLabelText("Player mana")).toHaveTextContent(
			"Mana 10 / 10",
		);
	});
	it.each([{ mana: 2 }, { knownSpells: ["heal"] as const }, { monsters: [] }])(
		"gives a free reason when targeting is unavailable: %j",
		async (overrides) => {
			const { user } = setup(overrides);
			await user.keyboard("z");
			expect(screen.getByLabelText("Action feedback")).toHaveTextContent(
				/mana|learned|visible target/,
			);
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		},
	);
	it("allows Tab focus onto a target, then casts in a direction with keys", async () => {
		const { user } = setup();
		await user.keyboard("z");
		await user.tab();
		expect(
			screen.getByRole("button", { name: "Target goblin at row 1, column 3" }),
		).toHaveFocus();
		await user.keyboard("{ArrowRight}");
		expect(screen.getByRole("log")).toHaveTextContent(
			"Magic Missile hits the goblin",
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
	});

	it.each([
		["{ArrowUp}", 1, 3],
		["w", 1, 3],
		["{ArrowDown}", 5, 3],
		["s", 5, 3],
		["{ArrowLeft}", 3, 1],
		["a", 3, 1],
		["{ArrowRight}", 3, 5],
		["d", 3, 5],
	])(
		"casts straight in direction %s without moving the player",
		async (key, row, col) => {
			const run = createOpenEncounter();
			const { user } = setup(
				{
					monsters: [
						{
							intent: { type: "idle" as const },
							id: "1:1",
							kind: "goblin",
							floorNumber: 1,
							coordinate: { row, col },
							health: 9,
						},
					],
				},
				run,
			);
			await user.keyboard(`z${key}`);
			expect(screen.getByRole("log")).toHaveTextContent(
				"Magic Missile hits the goblin",
			);
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
			expect(screen.getByLabelText("Player mana")).toHaveTextContent(
				"Mana 7 / 10",
			);
			expect(
				screen.getByRole("cell", { name: /row3col3 - player/i }),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: /Target goblin/ }),
			).not.toBeInTheDocument();
		},
	);
	it("chooses the nearest aligned monster rather than the farther one", async () => {
		const { user } = setup();
		await user.keyboard("zd");
		expect(screen.getByRole("log")).toHaveTextContent(
			"Magic Missile hits the goblin",
		);
		expect(screen.getByRole("log")).not.toHaveTextContent(
			"Magic Missile hits the giant rat",
		);
	});
	it("ignores an unaligned monster even when it is nearer than the directional target", async () => {
		const { user } = setup(
			{
				monsters: [
					{
						intent: { type: "idle" as const },
						id: "1:1",
						kind: "giant-rat",
						floorNumber: 1,
						coordinate: { row: 2, col: 4 },
						health: 9,
					},
					{
						intent: { type: "idle" as const },
						id: "1:2",
						kind: "goblin",
						floorNumber: 1,
						coordinate: { row: 3, col: 6 },
						health: 9,
					},
				],
			},
			{
				...createOpenEncounter(),
				floors: [
					createTestDungeonFloor({
						floorNumber: 1,
						rows: 7,
						cols: 8,
						room: { startRow: 1, endRow: 5, startCol: 1, endCol: 6 },
					}),
				],
			},
		);
		await user.keyboard("zd");
		expect(screen.getByRole("log")).toHaveTextContent(
			"Magic Missile hits the goblin",
		);
		expect(screen.getByRole("log")).not.toHaveTextContent(
			"Magic Missile hits the giant rat",
		);
	});

	it("keeps targeting open without spending resources when the direction is empty", async () => {
		const { user, map } = setup();
		await user.keyboard("z{ArrowLeft}");
		expect(screen.getByLabelText("Action feedback")).toHaveTextContent(
			"No visible target in that direction",
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		expect(screen.getByLabelText("Player mana")).toHaveTextContent(
			"Mana 10 / 10",
		);
		expect(
			screen.getByRole("button", { name: "Target goblin at row 1, column 3" }),
		).toBeInTheDocument();
		fireEvent.keyDown(map, { key: "ArrowRight", repeat: true });
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		await user.keyboard("d");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
	});

	it("never offers unseen targets when fog is enabled", async () => {
		const run = createCorridorEncounter();
		stubDungeonRun(run, [
			{
				intent: { type: "idle" as const },
				id: "1:1",
				kind: "goblin",
				floorNumber: 1,
				coordinate: { row: 1, col: 4 },
				health: 9,
			},
		]);
		renderUI(<Home initialFogConfiguration={{ enabled: true, radius: 1 }} />, {
			wrapper: ThemeProvider,
		});
		screen.getByLabelText("Dungeon map", { exact: true }).focus();
		await userEvent.setup().keyboard("z");
		expect(screen.getByLabelText("Action feedback")).toHaveTextContent(
			"No visible target",
		);
		expect(
			screen.queryByRole("button", { name: /Target goblin/ }),
		).not.toBeInTheDocument();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});

	it("protects menu browsing, modified keys and repeated activation", async () => {
		const { user, map } = setup();
		fireEvent.keyDown(map, { key: "z", repeat: true });
		fireEvent.keyDown(map, { key: "z", ctrlKey: true });
		expect(
			screen.queryByRole("button", { name: /Target goblin/ }),
		).not.toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Settings" }));
		await screen.findByRole("dialog");
		await user.keyboard("z{ArrowRight}{Enter}");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});
});
