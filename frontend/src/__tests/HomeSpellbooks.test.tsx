import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState, stubDungeonRun } from "./HomeTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import Home from "./TestHome";

afterEach(resetHomeTestState);
it("learns a found book with G, announces it, and shows the spell in the library", async () => {
	const run = createCorridorEncounter();
	stubDungeonRun(
		run,
		[],
		[
			{
				item: { id: "book", kind: "book-ember-bolt" },
				floorNumber: 1,
				coordinate: run.playerCoordinate,
			},
		],
	);
	render(<Home />, { wrapper: ThemeProvider });
	const user = userEvent.setup();
	await user.keyboard("g");
	expect(screen.getByRole("log")).toHaveTextContent(
		"You read Spellbook: Ember Bolt and learn its spell",
	);
	expect(
		within(screen.getByRole("region", { name: "Spell hotbar" })).getByRole(
			"button",
			{ name: "Ember Bolt, 4 mana" },
		),
	).toBeVisible();
	await user.keyboard("i");
	await user.click(screen.getByRole("tab", { name: "Spells" }));
	expect(screen.getByRole("article", { name: "Ember Bolt" })).toHaveTextContent(
		"Damage 8–12",
	);
});
