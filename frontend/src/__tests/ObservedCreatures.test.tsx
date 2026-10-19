import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import ObservedCreatures from "../components/monsters/ObservedCreatures";

it("explains currently visible traits without listing hidden creatures", () => {
	render(
		<ObservedCreatures
			visible={[[true, false]]}
			monsters={[
				{
					id: "1:1",
					kind: "salamander",
					floorNumber: 1,
					coordinate: { row: 0, col: 0 },
					health: 24,
					intent: { type: "idle" },
				},
				{
					id: "1:2",
					kind: "necromancer",
					floorNumber: 1,
					coordinate: { row: 0, col: 1 },
					health: 28,
					intent: { type: "idle" },
				},
			]}
		/>,
	);
	expect(screen.getByRole("heading", { name: "salamander" })).toBeVisible();
	expect(screen.getByText(/Resists fire/)).toBeVisible();
	expect(screen.getByText(/Weak to cold/)).toBeVisible();
	expect(screen.getByText(/2 response turns/)).toBeVisible();
	expect(
		screen.queryByRole("heading", { name: "necromancer" }),
	).not.toBeInTheDocument();
});

it("separates heroic and ordinary creatures of the same kind with correct scaled inspection", () => {
	render(
		<ObservedCreatures
			difficulty={1.25}
			monsters={[false, true].map((heroic, index) => ({
				id: `4:${index + 1}`,
				kind: "skeleton",
				heroic,
				floorNumber: 4,
				coordinate: { row: 4, col: 5 + index },
				health: 8,
				intent: { type: "idle" },
			}))}
		/>,
	);
	expect(
		screen.getByRole("heading", { name: /^Heroic skeleton$/ }),
	).toBeVisible();
	expect(screen.getByRole("heading", { name: /^skeleton$/ })).toBeVisible();
	expect(screen.getByText(/Maximum health 20/)).toHaveTextContent(
		"melee damage 9–11",
	);
	expect(screen.getByText(/Maximum health 10/)).toHaveTextContent(
		"melee damage 4–6",
	);
});
