import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { serializeSave } from "../domain/saves/SaveFormat";
import { LOCAL_SAVE_KEY } from "../persistence/LocalAdventureSave";
import { ThemeProvider } from "../settings/ThemeProvider";
import {
	enterDungeonFromTown,
	openSaveSheet,
	openSettings,
	resetHomeTestState,
	waitForSettingsClosed,
} from "./HomeTestHelpers";
import { savedAdventureWithPickupAndHealing } from "./SaveTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);
describe("Non-normal saved adventure controls", () => {
	it.each([
		["Easier", 0.75],
		["Harder", 1.25],
	] as const)(
		"restores %s shortcuts and replays its saved custom configuration",
		async (label, difficulty) => {
			const source = savedAdventureWithPickupAndHealing();
			source.configuration.difficulty = difficulty;
			localStorage.setItem(LOCAL_SAVE_KEY, serializeSave(source));
			const user = userEvent.setup();
			render(<Home />, { wrapper: ThemeProvider });
			await openSaveSheet(user);
			await user.click(screen.getByRole("button", { name: "Load adventure" }));
			await user.click(
				await screen.findByRole("button", { name: "Confirm load" }),
			);
			await waitFor(() =>
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
			);
			expect(screen.getByLabelText("Adventure difficulty")).toHaveTextContent(
				label,
			);
			expect(
				screen.getByLabelText("Dungeon map", { exact: true }),
			).toHaveFocus();
			await user.keyboard("gh");
			expect(screen.getByRole("log")).toHaveTextContent(
				"You pick up Healing potion",
			);
			expect(screen.getByLabelText("Player health")).toHaveTextContent(
				"Health 9 / 10",
			);
			await openSettings(user);
			expect(screen.getByRole("textbox", { name: "Rows" })).toHaveValue("15");
			expect(screen.getByRole("textbox", { name: "Columns" })).toHaveValue(
				"15",
			);
			expect(
				screen.getByRole("radio", { name: new RegExp(label) }),
			).toBeChecked();
			await user.click(screen.getByRole("button", { name: "Start from seed" }));
			await enterDungeonFromTown(user);
			await waitForSettingsClosed();
			expect(screen.getByLabelText("Adventure difficulty")).toHaveTextContent(
				label,
			);
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
			expect(
				screen.getByLabelText("Dungeon map", { exact: true }),
			).toHaveFocus();
			await user.keyboard(" ");
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
		},
	);
});
