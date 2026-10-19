import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import CharacterStats from "../components/game/CharacterStats";
import { maximumHealth } from "../domain/game/PlayerHealth";
import { savedAdventure } from "./SaveTestHelpers";

it("explains the current Disease capacity penalty against normal maximum HP", () => {
	const { state } = savedAdventure();
	const afflictions = [
		{ kind: "disease" as const, remaining: null, source: "test" },
	];
	const normal = maximumHealth(state.progression, state.equipment);
	const reduced = maximumHealth(
		state.progression,
		state.equipment,
		afflictions,
	);
	const view = render(
		<CharacterStats
			afflictions={afflictions}
			player={{ health: reduced, maxHealth: reduced }}
			mana={state.mana}
			equipment={state.equipment}
			progression={state.progression}
		/>,
	);
	expect(screen.getByLabelText("Character stats")).toHaveTextContent(
		`Disease −${normal - reduced} until cured (normal ${normal})`,
	);
	view.rerender(
		<CharacterStats
			player={{ health: normal, maxHealth: normal }}
			mana={state.mana}
			equipment={state.equipment}
			progression={state.progression}
		/>,
	);
	expect(screen.getByLabelText("Character stats")).not.toHaveTextContent(
		"Disease",
	);
});
