import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import AdventureOpening from "../components/game/AdventureOpening";
import { createAdventureSession } from "../components/game/useAdventureSession";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import {
	DEFAULT_FOG_CONFIGURATION,
	DEFAULT_RUN_CONFIGURATION,
	isStandardDungeon,
	MAX_SIZE,
} from "../domain/dungeon/RunConfiguration";
import { createGameState } from "../domain/game/GameState";
import { TEST_SEED } from "../domain/game/TestSeed";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState, stubDungeonRun } from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

afterEach(resetHomeTestState);
describe("The standard dungeon", () => {
	it("describes the one dungeon instead of offering sizes, and begins it whatever came before", async () => {
		const begin = vi.fn();
		const user = userEvent.setup();
		render(
			<AdventureOpening
				onBegin={begin}
				onRestore={vi.fn()}
				initialConfiguration={{
					...DEFAULT_RUN_CONFIGURATION,
					rows: 25,
					cols: 35,
					floorCount: 7,
					difficulty: 0.75,
				}}
			/>,
			{ wrapper: ThemeProvider },
		);
		const dungeon = screen.getByRole("region", { name: "The dungeon" });
		expect(dungeon).toHaveTextContent("Twenty floors deep");
		expect(dungeon).toHaveTextContent("40 × 40 tiles");
		expect(dungeon).toHaveTextContent("custom adventure, which isn't ranked");
		expect(screen.queryByRole("radio", { name: /Small|Medium|Large/ })).toBe(
			null,
		);
		expect(screen.getByRole("radio", { name: /Easier/ })).toBeChecked();
		await user.click(screen.getByRole("button", { name: "Begin Adventure" }));
		expect(begin).toHaveBeenCalledWith(
			{
				...DEFAULT_RUN_CONFIGURATION,
				difficulty: 0.75,
			},
			[],
		);
	});

	it("switches between light and dark from the opening, and remembers it", async () => {
		const user = userEvent.setup();
		render(<AdventureOpening onBegin={vi.fn()} onRestore={vi.fn()} />, {
			wrapper: ThemeProvider,
		});
		const appearance = screen.getByRole("group", { name: "Appearance" });
		expect(
			within(appearance).getByRole("radio", { name: "Dark" }),
		).toBeChecked();
		await user.click(within(appearance).getByRole("radio", { name: "Light" }));
		expect(document.documentElement).not.toHaveClass("dark");
		expect(localStorage.getItem("larn-theme")).toBe("light");
		await user.click(within(appearance).getByRole("radio", { name: "Dark" }));
		expect(document.documentElement).toHaveClass("dark");
		expect(localStorage.getItem("larn-theme")).toBe("dark");
	});

	it("begins a ranked 40×40, twenty-floor adventure at the chosen difficulty", async () => {
		const user = userEvent.setup();
		const { generate } = stubDungeonRun(createCorridorEncounter());
		render(<App />);
		await user.click(screen.getByRole("radio", { name: /Harder/ }));
		await user.click(screen.getByRole("button", { name: "Begin Adventure" }));
		expect(generate).toHaveBeenCalledWith(
			expect.any(Number),
			20,
			expect.objectContaining({ rows: 40, cols: 40 }),
		);
		expect(screen.getByLabelText("Adventure difficulty")).toHaveTextContent(
			"Harder",
		);
		expect(screen.getByLabelText("Town map", { exact: true })).toHaveFocus();
	});

	it("caps custom sizes at 40 and ranks only standard adventures started that way", () => {
		expect(MAX_SIZE).toBe(40);
		expect(() =>
			generateDungeonRun(1, 5, { ...COMPACT_TEST_CONFIGURATION, rows: 41 }),
		).toThrow();
		expect(isStandardDungeon(DEFAULT_RUN_CONFIGURATION)).toBe(true);
		expect(
			isStandardDungeon({ ...DEFAULT_RUN_CONFIGURATION, floorCount: 19 }),
		).toBe(false);
		const ranked = createAdventureSession(
			7,
			DEFAULT_RUN_CONFIGURATION,
			DEFAULT_FOG_CONFIGURATION,
			true,
		);
		expect(ranked.state.ranked).toBe(true);
		expect(
			createAdventureSession(
				7,
				DEFAULT_RUN_CONFIGURATION,
				DEFAULT_FOG_CONFIGURATION,
			).state.ranked,
		).toBeUndefined();
		// The test seed is never ranked.
		expect(
			createAdventureSession(
				TEST_SEED,
				DEFAULT_RUN_CONFIGURATION,
				DEFAULT_FOG_CONFIGURATION,
				true,
			).state.ranked,
		).toBeUndefined();
	});

	it("saves the ranked flag, and rejects it on a custom dungeon or an oversized one", () => {
		const save = (
			state: ReturnType<typeof createGameState>,
			configuration = DEFAULT_RUN_CONFIGURATION,
		) =>
			parseSave(
				serializeSave(
					createSaveDocument(
						state,
						updateExploration(state.run, DEFAULT_FOG_CONFIGURATION.radius),
						configuration,
						DEFAULT_FOG_CONFIGURATION,
					),
				),
			);
		const compact = {
			...createGameState(
				connectDungeonFloors(
					generateDungeonRun(3, 5, COMPACT_TEST_CONFIGURATION),
				),
			),
		};
		const unranked = save(compact, COMPACT_TEST_CONFIGURATION);
		if (!unranked.ok) throw new Error(unranked.error);
		expect(restoreSave(unranked.value).state.ranked).toBeUndefined();
		expect(
			save({ ...compact, ranked: true }, COMPACT_TEST_CONFIGURATION).ok,
		).toBe(false);
		const standard = {
			...createGameState(
				connectDungeonFloors(
					generateDungeonRun(3, 20, DEFAULT_RUN_CONFIGURATION),
				),
			),
			ranked: true as const,
		};
		const ranked = save(standard);
		if (!ranked.ok) throw new Error(ranked.error);
		expect(restoreSave(ranked.value).state.ranked).toBe(true);
		const document = JSON.parse(
			serializeSave(
				createSaveDocument(
					compact,
					updateExploration(compact.run, DEFAULT_FOG_CONFIGURATION.radius),
					COMPACT_TEST_CONFIGURATION,
					DEFAULT_FOG_CONFIGURATION,
				),
			),
		);
		document.configuration.rows = 60;
		expect(parseSave(JSON.stringify(document)).ok).toBe(false);
	});
});
