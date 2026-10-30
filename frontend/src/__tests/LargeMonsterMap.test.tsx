import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DungeonLayout from "../components/dungeon/DungeonLayout";
import type { Monster } from "../domain/monsters/Monster";
import { createTestDungeonFloor } from "./testhelpers";

const terrain = createTestDungeonFloor({
	floorNumber: 1,
	rows: 6,
	cols: 7,
	room: { startRow: 1, endRow: 4, startCol: 1, endCol: 5 },
}).terrain;
// Its 2×2 body covers rows 1–2, columns 2–3.
const lich: Monster = {
	id: "1:1000020",
	kind: "bone-lich",
	floorNumber: 1,
	coordinate: { row: 1, col: 2 },
	health: 40,
	intent: { type: "idle" },
};
const props = {
	dungeon: terrain,
	playerPosition: { row: 4, col: 1 },
	monsters: [lich],
	onMoveRequested: vi.fn(),
};
const body = ["row1col2", "row1col3", "row2col2", "row2col3"];

describe("2×2 monsters on the map", () => {
	it("names every tile of its body, and draws it once across them", () => {
		const { container } = render(<DungeonLayout {...props} />);
		for (const cell of body)
			expect(screen.getByLabelText(`${cell} - Bone Lich`)).toBeVisible();
		expect(screen.getByLabelText("row3col2 - floor")).toBeVisible();
		const drawings = container.querySelectorAll(
			'[data-testid="large-monster"]',
		);
		expect(drawings).toHaveLength(1);
		expect(drawings[0]).toHaveStyle({
			width: "calc(var(--dungeon-tile-size) * 2)",
			height: "calc(var(--dungeon-tile-size) * 2)",
		});
		// The cells themselves carry no drawing of their own.
		for (const cell of body)
			expect(
				screen.getByLabelText(`${cell} - Bone Lich`).querySelector("svg"),
			).toBeNull();
	});

	it("targets from any of its tiles, with one keyboard stop", async () => {
		const cast = vi.fn();
		render(
			<DungeonLayout
				{...props}
				targetIds={[lich.id]}
				onTargetRequested={cast}
			/>,
		);
		const targets = screen.getAllByRole("button", {
			name: /^Target Bone Lich/,
		});
		expect(targets).toHaveLength(4);
		expect(
			targets.filter((target) => target.getAttribute("tabindex") !== "-1"),
		).toHaveLength(1);
		await userEvent.setup().click(
			screen.getByRole("button", {
				name: "Target Bone Lich at row 2, column 3",
			}),
		);
		expect(cast).toHaveBeenCalledExactlyOnceWith(lich.id);
	});

	it("stays drawn while any of its tiles is in view, and hides once none is", () => {
		const seen = (tiles: readonly string[]) =>
			terrain.map((row, r) => row.map((_, c) => tiles.includes(`${r}:${c}`)));
		const { container, rerender } = render(
			<DungeonLayout {...props} visible={seen(["2:3", "4:1"])} />,
		);
		expect(
			container.querySelectorAll('[data-testid="large-monster"]'),
		).toHaveLength(1);
		rerender(<DungeonLayout {...props} visible={seen(["4:1"])} />);
		expect(
			container.querySelectorAll('[data-testid="large-monster"]'),
		).toHaveLength(0);
	});
});
