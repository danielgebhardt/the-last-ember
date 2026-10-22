import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { createAdventureSession } from "../components/game/useAdventureSession";
import {
	DEFAULT_FOG_CONFIGURATION,
	DEFAULT_RUN_CONFIGURATION,
} from "../domain/dungeon/RunConfiguration";
import { TEST_SEED } from "../domain/game/TestSeed";
import Home from "../Home";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState } from "./HomeTestHelpers";

afterEach(resetHomeTestState);
it("offers loading but no saving or export on the reserved test seed", async () => {
	render(
		<Home
			initialAdventure={createAdventureSession(
				TEST_SEED,
				DEFAULT_RUN_CONFIGURATION,
				DEFAULT_FOG_CONFIGURATION,
			)}
		/>,
		{ wrapper: ThemeProvider },
	);
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Save/Load" }));
	const sheet = within(
		await screen.findByRole("dialog", { name: "Load adventure" }),
	);
	expect(
		sheet.getByText(/reserved test seed, so saving is disabled/),
	).toBeVisible();
	expect(
		sheet.queryByRole("button", { name: "Save adventure" }),
	).not.toBeInTheDocument();
	expect(
		sheet.queryByRole("button", { name: /Export/ }),
	).not.toBeInTheDocument();
	expect(sheet.getByRole("button", { name: "Load adventure" })).toBeVisible();
});
