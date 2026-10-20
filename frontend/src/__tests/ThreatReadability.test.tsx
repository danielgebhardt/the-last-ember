import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StatusEffectIcons from "../components/game/StatusEffectIcons";
import VisibleEffects from "../components/game/VisibleEffects";
import type { Monster } from "../domain/monsters/Monster";
import { monsterTraits } from "../domain/monsters/MonsterTraits";

const charger: Monster = {
	id: "1:1",
	kind: "horned-charger",
	floorNumber: 1,
	coordinate: { row: 0, col: 0 },
	health: 14,
	intent: { type: "preparing-charge", target: { row: 0, col: 3 } },
};
describe("Actionable visible threats", () => {
	it("shows the source and response opportunity for a visible charge", () => {
		render(
			<VisibleEffects effects={[]} monsters={[charger]} visible={[[true]]} />,
		);
		expect(
			screen.getByRole("list", { name: "Visible threats" }),
		).toHaveTextContent(
			/horned charger at row 0, column 0.*Sidestep.*next action/i,
		);
	});
	it("hides prepared threats when their source is hidden or dead", () => {
		render(
			<VisibleEffects
				effects={[]}
				monsters={[charger, { ...charger, id: "1:2", health: 0 }]}
				visible={[[false]]}
			/>,
		);
		expect(
			screen.queryByRole("list", { name: "Visible threats" }),
		).not.toBeInTheDocument();
	});
	it("moves player conditions into the HUD without duplicating dungeon notices", () => {
		render(<VisibleEffects effects={[]} monsters={[]} />);
		expect(
			screen.queryByRole("list", { name: "Your conditions" }),
		).not.toBeInTheDocument();
		render(
			<StatusEffectIcons
				effects={[]}
				afflictions={[
					{ kind: "poisoned" as const, remaining: 2, source: "test" },
				]}
			/>,
		);
		expect(
			screen.getByRole("button", { name: "Poison — 2 phases remaining" }),
		).toHaveAccessibleDescription(/1 damage after monsters.*Antidote/i);
	});
	it("explains ranged cover and prepared-attack interruption without new rules", () => {
		expect(monsterTraits("goblin-archer").join(" ")).toMatch(
			/closed doors.*break.*shot/i,
		);
		expect(monsterTraits("dungeon-brute").join(" ")).toMatch(/Sleep or Fear/i);
	});
});

it("shows actual monster poison potency and remaining potential damage", () => {
	render(
		<VisibleEffects
			monsters={[charger]}
			monsterPoisonDamage={6}
			effects={[
				{ actorId: charger.id, floorNumber: 1, kind: "poisoned", remaining: 5 },
			]}
		/>,
	);
	expect(
		screen.getByRole("list", { name: "Visible monster conditions" }),
	).toHaveTextContent(
		"6 damage after its active-floor response; up to 30 damage remaining",
	);
});
