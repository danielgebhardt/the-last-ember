import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import { createGameState } from "../domain/game/GameState";
import {
	createSaveDocument,
	parseSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { LOCAL_SAVE_KEY } from "../persistence/LocalAdventureSave";
import { ThemeProvider } from "../settings/ThemeProvider";
import {
	closeSaveSheet,
	closeSettings,
	enterDungeonFromTown,
	openSaveSheet,
	openSettings,
	readDungeonCells,
	resetHomeTestState,
} from "./HomeTestHelpers";
import {
	savedAdventure,
	savedAdventureWithPickupAndHealing,
} from "./SaveTestHelpers";
import Home from "./TestHome";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const setup = () => {
	render(<Home />, { wrapper: ThemeProvider });
	screen.getByLabelText("Dungeon map", { exact: true }).focus();
	return userEvent.setup();
};
const openSave = async (user: ReturnType<typeof userEvent.setup>) => {
	await openSaveSheet(user);
	await user.click(screen.getByRole("button", { name: "Save adventure" }));
	return screen.findByRole("dialog", { name: "Save this adventure?" });
};
const finishConfirmation = async (name: string) => {
	await waitFor(() =>
		expect(screen.queryByRole("dialog", { name })).not.toBeInTheDocument(),
	);
};
afterEach(resetHomeTestState);
describe("Confirmed local Save and Load", () => {
	it("opens a dedicated sheet, pauses gameplay and returns focus when dismissed", async () => {
		const user = setup();
		await openSettings(user);
		expect(
			screen.queryByRole("region", { name: "Adventure saves" }),
		).not.toBeInTheDocument();
		await closeSettings(user);
		const sheet = await openSaveSheet(user);
		expect(
			within(sheet).getByRole("button", { name: "Save adventure" }),
		).toBeVisible();
		expect(
			within(sheet).getByRole("button", { name: "Load autosave" }),
		).toBeVisible();
		expect(
			within(sheet).queryByRole("button", { name: "Import file" }),
		).not.toBeInTheDocument();
		expect(
			within(sheet).queryByRole("textbox", { name: "Dungeon seed" }),
		).not.toBeInTheDocument();
		await user.keyboard("wz 1hci{ArrowRight}");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		expect(
			screen.queryByRole("dialog", { name: "The Adventurer's Ledger" }),
		).not.toBeInTheDocument();
		await closeSaveSheet(user);
		expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus();
		await user.keyboard(" ");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
	});
	it("asks even for the first save, focuses Cancel and pauses gameplay", async () => {
		const user = setup();
		const dialog = await openSave(user);
		await waitFor(() =>
			expect(
				within(dialog).getByRole("button", { name: "Cancel" }),
			).toHaveFocus(),
		);
		await user.keyboard("wz 1{ArrowRight}");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		expect(localStorage.getItem(LOCAL_SAVE_KEY)).toBeNull();
		await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
		await finishConfirmation("Save this adventure?");
		expect(
			screen.getByRole("button", { name: "Save adventure" }),
		).toHaveFocus();
		expect(localStorage.getItem(LOCAL_SAVE_KEY)).toBeNull();
	});
	it("saves only after confirmation, then loads the exact earlier run without spending a turn", async () => {
		const user = setup();
		await user.keyboard("   ");
		const cells = readDungeonCells();
		await openSave(user);
		await user.click(screen.getByRole("button", { name: "Confirm save" }));
		await finishConfirmation("Save this adventure?");
		expect(screen.getByLabelText("Save feedback")).toHaveTextContent(
			"Adventure saved",
		);
		const text = localStorage.getItem(LOCAL_SAVE_KEY);
		if (!text) throw new Error("Confirmed save should exist");
		const saved = parseSave(text);
		if (!saved.ok) throw new Error(saved.error);
		expect(saved.value.state.turn).toBe(3);
		await closeSaveSheet(user);
		screen.getByLabelText("Dungeon map", { exact: true }).focus();
		await user.keyboard(" ");
		await openSaveSheet(user);
		await user.click(screen.getByRole("button", { name: "Load adventure" }));
		const dialog = await screen.findByRole("dialog", {
			name: "Load saved adventure?",
		});
		expect(dialog).toHaveTextContent("Turn 3");
		expect(dialog).toHaveTextContent("current progress will be replaced");
		await user.click(
			within(dialog).getByRole("button", { name: "Confirm load" }),
		);
		await waitFor(() =>
			expect(
				screen.queryByRole("dialog", { name: "Save/Load" }),
			).not.toBeInTheDocument(),
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 3");
		expect(readDungeonCells()).toEqual(cells);
		expect(localStorage.getItem(LOCAL_SAVE_KEY)).toBe(text);
		await waitFor(() =>
			expect(
				screen.getByLabelText("Dungeon map", { exact: true }),
			).toHaveFocus(),
		);
		await user.keyboard(" ");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 4");
	});
	it("restores pickup and healing shortcuts after each confirmed load without clicking the map", async () => {
		localStorage.setItem(
			LOCAL_SAVE_KEY,
			serializeSave(savedAdventureWithPickupAndHealing()),
		);
		const user = setup();
		for (let load = 0; load < 2; load++) {
			await openSaveSheet(user);
			await user.click(screen.getByRole("button", { name: "Load adventure" }));
			await user.click(
				await screen.findByRole("button", { name: "Confirm load" }),
			);
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
			);
			await user.keyboard("gh");
			expect(screen.getByRole("log")).toHaveTextContent(
				"You pick up Healing potion",
			);
			expect(screen.getByLabelText("Player health")).toHaveTextContent(
				"Health 9 / 10",
			);
			expect(screen.getByLabelText("Player mana")).toHaveTextContent(
				"Mana 6 / 10",
			);
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 5");
		}
	});

	it("keeps the old save when replacement is canceled with Escape", async () => {
		const old = serializeSave(savedAdventure());
		localStorage.setItem(LOCAL_SAVE_KEY, old);
		const user = setup();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		const dialog = await openSave(user);
		expect(dialog).toHaveTextContent("Replacing: Seed 123");
		await user.keyboard("{Escape}");
		await finishConfirmation("Save this adventure?");
		expect(screen.getByRole("dialog", { name: "Save/Load" })).toBeVisible();
		expect(localStorage.getItem(LOCAL_SAVE_KEY)).toBe(old);
	});
	it("leaves current progress untouched when Load is canceled", async () => {
		const old = serializeSave(savedAdventure());
		localStorage.setItem(LOCAL_SAVE_KEY, old);
		const user = setup();
		await user.keyboard("  ");
		await openSaveSheet(user);
		await user.click(screen.getByRole("button", { name: "Load adventure" }));
		await screen.findByRole("dialog", { name: "Load saved adventure?" });
		await user.keyboard("{Escape}");
		await finishConfirmation("Load saved adventure?");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 2");
		expect(localStorage.getItem(LOCAL_SAVE_KEY)).toBe(old);
		expect(
			screen.getByRole("button", { name: "Load adventure" }),
		).toHaveFocus();
	});
	it("cannot load a missing or invalid save", async () => {
		const user = setup();
		await openSaveSheet(user);
		expect(
			screen.getByRole("button", { name: "Load adventure" }),
		).toBeDisabled();
		await closeSaveSheet(user);
		localStorage.setItem(LOCAL_SAVE_KEY, "corrupt");
		await openSaveSheet(user);
		expect(
			screen.getByRole("region", { name: "Adventure saves" }),
		).toHaveTextContent("not a valid adventure save");
		expect(
			screen.getByRole("button", { name: "Load adventure" }),
		).toBeDisabled();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});
	it("shows a failed write and preserves the old slot and current run", async () => {
		const old = serializeSave(savedAdventure());
		localStorage.setItem(LOCAL_SAVE_KEY, old);
		const user = setup();
		await openSave(user);
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("Full");
		});
		await user.click(screen.getByRole("button", { name: "Confirm save" }));
		await finishConfirmation("Save this adventure?");
		expect(screen.getByLabelText("Save feedback")).toHaveTextContent(
			"previous save was not replaced",
		);
		expect(localStorage.getItem(LOCAL_SAVE_KEY)).toBe(old);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});
	it("restores configuration, fog, progression and spell knowledge together for future new runs", async () => {
		const config = { ...COMPACT_TEST_CONFIGURATION, rows: 10, cols: 12 };
		const run = connectDungeonFloors(generateDungeonRun(123, 5, config));
		const state = {
			...createGameState(run),
			player: { health: 8, maxHealth: 14 },
			progression: { experience: 44 },
			mana: 5,
			knownSpells: ["heal"] as const,
			spellHotbar: ["heal", null, null, null, null, null] as const,
		};
		const document = createSaveDocument(
			state,
			updateExploration(run, 2),
			config,
			{ enabled: false, radius: 2 },
		);
		localStorage.setItem(LOCAL_SAVE_KEY, serializeSave(document));
		const user = setup();
		await openSaveSheet(user);
		await user.click(screen.getByRole("button", { name: "Load adventure" }));
		await screen.findByRole("dialog", { name: "Load saved adventure?" });
		await user.click(screen.getByRole("button", { name: "Confirm load" }));
		await waitFor(() =>
			expect(
				screen.queryByRole("dialog", { name: "Save/Load" }),
			).not.toBeInTheDocument(),
		);
		expect(screen.getByLabelText("Player level")).toHaveTextContent("Level 3");
		expect(screen.getByLabelText("Player experience")).toHaveTextContent(
			"14 / 30 XP",
		);
		expect(screen.getByLabelText("Player mana")).toHaveTextContent(
			"Mana 5 / 12",
		);
		expect(screen.getByLabelText("Player health")).toHaveTextContent(
			"Health 8 / 14",
		);
		expect(
			within(screen.getByRole("region", { name: "Spell hotbar" })).getAllByRole(
				"button",
			),
		).toHaveLength(1);
		expect(screen.getAllByRole("cell")).toHaveLength(120);
		await openSettings(user);
		expect(
			screen.getByLabelText("Current dungeon configuration"),
		).toHaveTextContent("10 rows × 12 columns");
		expect(
			screen.getByRole("checkbox", { name: "Enable fog of war" }),
		).not.toBeChecked();
		expect(
			screen.getByRole("textbox", { name: "Visibility radius" }),
		).toHaveValue("2");
		await closeSettings(user);
		await user.click(screen.getByRole("button", { name: "New Dungeon" }));
		await user.click(screen.getByRole("button", { name: "Start new dungeon" }));
		await enterDungeonFromTown(user);
		expect(screen.getAllByRole("cell")).toHaveLength(120);
		expect(screen.getByLabelText("Player level")).toHaveTextContent("Level 1");
	});
	it("revalidates the slot at Load time if it changed while Save/Load was open", async () => {
		localStorage.setItem(LOCAL_SAVE_KEY, serializeSave(savedAdventure()));
		const user = setup();
		await openSaveSheet(user);
		localStorage.setItem(LOCAL_SAVE_KEY, "corrupt after opening");
		await user.click(screen.getByRole("button", { name: "Load adventure" }));
		expect(screen.getByLabelText("Save feedback")).toHaveTextContent(
			"not a valid",
		);
		expect(
			screen.queryByRole("dialog", { name: "Load saved adventure?" }),
		).not.toBeInTheDocument();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});
});
