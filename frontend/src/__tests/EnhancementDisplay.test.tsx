import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import CharacterStats from "../components/game/CharacterStats";
import ProgressionView from "../components/game/ProgressionView";
import { createGameState } from "../domain/game/GameState";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

it("shows effective combat and attributes while earned experience remains unchanged", () => {
	const state = createGameState(createCorridorEncounter());
	const effects = [
		{
			actorId: "player",
			floorNumber: null,
			kind: "strengthened" as const,
			remaining: 3,
		},
		{
			actorId: "player",
			floorNumber: null,
			kind: "protected" as const,
			remaining: 3,
		},
	];
	render(
		<>
			<CharacterStats
				mana={5}
				player={state.player}
				equipment={state.equipment}
				progression={state.progression}
				effects={effects}
			/>
			<ProgressionView progression={state.progression} effects={effects} />
		</>,
	);
	expect(screen.getByLabelText("Character attack")).toHaveTextContent(
		"Attack 2–4",
	);
	expect(screen.getByLabelText("Character armor")).toHaveTextContent("Armor 3");
	expect(screen.getByLabelText("Character Strength")).toHaveTextContent(
		"Strength 12",
	);
	expect(screen.getByLabelText("Total experience")).toHaveTextContent(
		"0 XP total",
	);
});
