import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "../App";
import { createAdventureSession } from "../components/game/useAdventureSession";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { TEST_SEED } from "../domain/game/TestSeed";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	saveSummary,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { TOWN } from "../domain/town/TownDefinition";
import { createTownLocation } from "../domain/town/TownLocation";
import Home from "../Home";
import {
	AUTOSAVE_KEY,
	LOCAL_SAVE_KEY,
} from "../persistence/LocalAdventureSave";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState } from "./HomeTestHelpers";
import { savedAdventureWithPickupAndHealing } from "./SaveTestHelpers";
import { COMPACT_TEST_CONFIGURATION as config } from "./TestRunConfiguration";

afterEach(resetHomeTestState);
const autosaved = () => {
	const text = localStorage.getItem(AUTOSAVE_KEY);
	if (text === null) return null;
	const parsed = parseSave(text);
	if (!parsed.ok) throw new Error(parsed.error);
	return parsed.value;
};
// A fresh adventure standing at the town gate, as a new run begins.
const renderAtGate = (seed = 123) => {
	const initial = createAdventureSession(
		seed,
		config,
		DEFAULT_FOG_CONFIGURATION,
	);
	render(
		<Home
			initialAdventure={{
				...initial,
				state: {
					...initial.state,
					town: { ...createTownLocation(), coordinate: { ...TOWN.gate } },
				},
			}}
		/>,
		{ wrapper: ThemeProvider },
	);
	return userEvent.setup();
};

describe("Autosave", () => {
	it("saves a new adventure's start and each floor change to its own slot", async () => {
		const user = renderAtGate();
		await waitFor(() => expect(autosaved()?.state.town).not.toBeNull());
		await user.keyboard("{Enter}");
		await waitFor(() => expect(autosaved()?.state.town).toBeNull());
		expect(autosaved()?.state.run.activeFloor).toBe(1);
		expect(localStorage.getItem(LOCAL_SAVE_KEY)).toBeNull();
	});
	it("never autosaves the reserved test seed", async () => {
		const user = renderAtGate(TEST_SEED);
		await user.keyboard("{Enter}");
		await screen.findByLabelText("Dungeon map", { exact: true });
		expect(localStorage.getItem(AUTOSAVE_KEY)).toBeNull();
	});
	it("clears the autosave when the adventure ends in death, and keeps the manual save", async () => {
		const saved = savedAdventureWithPickupAndHealing();
		const dying = {
			...saved,
			state: {
				...saved.state,
				player: { ...saved.state.player, health: 1 },
				afflictions: [
					{ kind: "poisoned" as const, remaining: 3, source: "test" },
				],
			},
		};
		localStorage.setItem(AUTOSAVE_KEY, serializeSave(saved));
		localStorage.setItem(LOCAL_SAVE_KEY, serializeSave(saved));
		render(<Home initialAdventure={restoreSave(dying)} />, {
			wrapper: ThemeProvider,
		});
		screen.getByLabelText("Dungeon map", { exact: true }).focus();
		await userEvent.setup().keyboard(" ");
		await waitFor(() => expect(localStorage.getItem(AUTOSAVE_KEY)).toBeNull());
		expect(localStorage.getItem(LOCAL_SAVE_KEY)).toBe(serializeSave(saved));
	});
	it("shows the autosave in Save/Load beside the browser save", async () => {
		const saved = savedAdventureWithPickupAndHealing();
		localStorage.setItem(AUTOSAVE_KEY, serializeSave(saved));
		render(<Home initialAdventure={restoreSave(saved)} />, {
			wrapper: ThemeProvider,
		});
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Save/Load" }));
		const card = within(
			await screen.findByRole("region", { name: "Autosave" }),
		);
		expect(card.getByText(saveSummary(saved))).toBeVisible();
		await user.click(card.getByRole("button", { name: "Load autosave" }));
		expect(
			await screen.findByRole("button", { name: "Confirm load" }),
		).toBeVisible();
	});
});

describe("Continue autosave on the opening", () => {
	it("continues a valid autosave directly", async () => {
		const saved = createSaveDocument(
			{ ...restoreSave(savedAdventureWithPickupAndHealing()).state },
			restoreSave(savedAdventureWithPickupAndHealing()).exploration,
			config,
			DEFAULT_FOG_CONFIGURATION,
		);
		localStorage.setItem(AUTOSAVE_KEY, serializeSave(saved));
		render(<App />);
		const user = userEvent.setup();
		const button = screen.getByRole("button", { name: "Continue autosave" });
		expect(button).toHaveAccessibleDescription(
			expect.stringContaining(saveSummary(saved)),
		);
		await user.click(button);
		await waitFor(() =>
			expect(
				screen.getByLabelText("Dungeon map", { exact: true }),
			).toBeVisible(),
		);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent(
			`Turn ${saved.state.turn}`,
		);
	});
	it("offers nothing when the autosave is missing or unreadable", () => {
		localStorage.setItem(AUTOSAVE_KEY, "{broken");
		render(<App />);
		expect(
			screen.queryByRole("button", { name: "Continue autosave" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Load an existing save" }),
		).toBeVisible();
	});
});
