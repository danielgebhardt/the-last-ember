import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { LOCAL_SAVE_KEY } from "../persistence/LocalAdventureSave";
import { ThemeProvider } from "../settings/ThemeProvider";
import {
	closeSaveSheet,
	openSaveSheet,
	readDungeonCells,
	resetHomeTestState,
} from "./HomeTestHelpers";
import {
	preparedMixedEncounter,
	tacticalSnapshot,
} from "./TacticalReplayTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);
const load = async (method: "local" | "file") => {
	const state = preparedMixedEncounter();
	const bytes = serializeSave(tacticalSnapshot(state));
	localStorage.setItem(LOCAL_SAVE_KEY, bytes);
	render(<Home />, { wrapper: ThemeProvider });
	const user = userEvent.setup();
	await openSaveSheet(user);
	if (method === "local") {
		await user.click(screen.getByRole("button", { name: "Load adventure" }));
		await user.click(
			await screen.findByRole("button", { name: "Confirm load" }),
		);
	} else {
		await user.upload(
			screen.getByLabelText("Import adventure file"),
			new File([bytes], "tactical.json", { type: "application/json" }),
		);
	}
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
	);
	await waitFor(() =>
		expect(screen.getByLabelText("Dungeon map", { exact: true })).toHaveFocus(),
	);
	return { user, state, bytes };
};

describe("Restored tactical encounters in Home", () => {
	it.each(["local", "file"] as const)(
		"pauses a prepared attack in Character and resumes keyboard targeting/healing after %s load",
		async (method) => {
			const { user, state, bytes } = await load(method);
			expect(
				screen.getByLabelText("row4col4 - player - prepared heavy attack"),
			).toBeVisible();
			await user.keyboard("i");
			await screen.findByRole("dialog", { name: "The Adventurer's Ledger" });
			await user.keyboard(" zh");
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
			expect(localStorage.getItem(LOCAL_SAVE_KEY)).toBe(bytes);
			await user.keyboard("i");
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
			);

			await user.keyboard("z");
			expect(
				screen.getByRole("button", {
					name: "Target dungeon brute at row 4, column 5",
				}),
			).toBeVisible();
			await user.keyboard("{Escape}h");
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 2");
			expect(screen.getByRole("log")).toHaveTextContent("Heal restores");
			// Confirm a save to inspect the real Home-owned aggregate, without a
			// state-exposing test hook. Opening/confirming this sheet costs no turn.
			await openSaveSheet(user);
			await user.click(screen.getByRole("button", { name: "Save adventure" }));
			await user.click(
				await screen.findByRole("button", { name: "Confirm save" }),
			);
			await waitFor(() =>
				expect(
					screen.queryByRole("dialog", { name: "Save this adventure?" }),
				).not.toBeInTheDocument(),
			);
			const current = localStorage.getItem(LOCAL_SAVE_KEY);
			if (!current) throw new Error("Confirmed save must exist.");
			const parsed = parseSave(current);
			if (!parsed.ok) throw new Error(parsed.error);
			expect(restoreSave(parsed.value).state).toEqual(
				resolvePlayerAction(state, { type: "cast", spell: "heal" }).state,
			);
		},
	);

	it.each(["malformed intent", "bad target", "protected location"])(
		"keeps a played tactical run and the saved slot when importing %s",
		async (fault) => {
			const { user, state, bytes } = await load("local");
			const cells = readDungeonCells();
			const history = screen.getByRole("log").textContent;
			const invalid = tacticalSnapshot(state);
			const brute = invalid.state.monsters[0];
			if (fault === "malformed intent")
				Reflect.set(brute, "intent", { type: "charging" });
			else if (fault === "bad target")
				Reflect.set(brute, "intent", {
					type: "preparing-attack",
					target: { row: 15, col: 4 },
				});
			else {
				const stair = invalid.state.run.floors[3].downStair;
				if (!stair) throw new Error("Floor 4 needs its protected down stair.");
				brute.coordinate = stair.coordinate;
			}
			await openSaveSheet(user);
			await user.upload(
				screen.getByLabelText("Import adventure file"),
				new File([serializeSave(invalid)], "invalid.json", {
					type: "application/json",
				}),
			);
			await waitFor(() =>
				expect(screen.getByLabelText("Save feedback")).toHaveTextContent(
					/invalid|inconsistent/,
				),
			);
			expect(screen.getByRole("dialog", { name: "Save/Load" })).toBeVisible();
			expect(localStorage.getItem(LOCAL_SAVE_KEY)).toBe(bytes);
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
			await closeSaveSheet(user);
			expect(readDungeonCells()).toEqual(cells);
			expect(screen.getByRole("log").textContent).toBe(history);
		},
	);
});
