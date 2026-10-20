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

it("shows Slowed's evasion loss against the normal figure", () => {
	const { state } = savedAdventure();
	const props = {
		player: state.player,
		mana: state.mana,
		equipment: state.equipment,
		progression: state.progression,
	};
	const view = render(
		<CharacterStats
			{...props}
			afflictions={[{ kind: "slowed", remaining: 5, source: "web" }]}
		/>,
	);
	const evasion = screen.getByLabelText("Character evasion");
	const normal =
		Number(/Evade (\d+)%/.exec(evasion.textContent ?? "")?.[1]) + 10;
	expect(evasion).toHaveTextContent(`Evade ${normal - 10}% (Slowed −10)`);
	view.rerender(<CharacterStats {...props} />);
	expect(screen.getByLabelText("Character evasion")).toHaveTextContent(
		`Evade ${normal}%`,
	);
	expect(screen.getByLabelText("Character evasion")).not.toHaveTextContent(
		"Slowed",
	);
});

it("notes Mana Burn's stopped recovery on the mana card", () => {
	const { state } = savedAdventure();
	const props = {
		player: state.player,
		mana: state.mana,
		equipment: state.equipment,
		progression: state.progression,
	};
	const view = render(
		<CharacterStats
			{...props}
			afflictions={[{ kind: "mana-burn", remaining: 42, source: "leech" }]}
		/>,
	);
	expect(screen.getByLabelText("Character stats")).toHaveTextContent(
		"Mana Burn: no passive recovery for 42 phases",
	);
	view.rerender(<CharacterStats {...props} />);
	expect(screen.getByLabelText("Character stats")).not.toHaveTextContent(
		"Mana Burn",
	);
});
