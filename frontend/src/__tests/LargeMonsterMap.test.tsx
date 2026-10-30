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

	it("keeps one keyboard stop on a tile in view when its top-left tile is hidden", () => {
		const seen = (tiles: readonly string[]) =>
			terrain.map((row, r) => row.map((_, c) => tiles.includes(`${r}:${c}`)));
		render(
			<DungeonLayout
				{...props}
				visible={seen(["2:2", "2:3", "4:1"])}
				targetIds={[lich.id]}
			/>,
		);
		const stops = screen
			.getAllByRole("button", { name: /^Target Bone Lich/ })
			.filter((target) => target.getAttribute("tabindex") !== "-1");
		expect(stops.map((stop) => stop.getAttribute("aria-label"))).toEqual([
			"Target Bone Lich at row 2, column 2",
		]);
	});

	it("shows only the parts of it over tiles in view, and hides once none is", () => {
		const seen = (tiles: readonly string[]) =>
			terrain.map((row, r) => row.map((_, c) => tiles.includes(`${r}:${c}`)));
		const drawings = (container: HTMLElement) => [
			...container.querySelectorAll<HTMLElement>(
				'[data-testid="large-monster"]',
			),
		];
		const { container, rerender } = render(
			<DungeonLayout
				{...props}
				visible={seen(["1:2", "1:3", "2:2", "2:3", "4:1"])}
			/>,
		);
		// In full view: one drawing across its four tiles.
		expect(drawings(container)).toHaveLength(1);
		// Only its lower-right tile in view: a one-tile window onto that part.
		rerender(<DungeonLayout {...props} visible={seen(["2:3", "4:1"])} />);
		const [window] = drawings(container);
		expect(drawings(container)).toHaveLength(1);
		expect(window).toHaveStyle({
			top: "calc(var(--dungeon-tile-size) * 2)",
			left: "calc(var(--dungeon-tile-size) * 3)",
			width: "calc(var(--dungeon-tile-size) * 1)",
		});
		expect(window.firstElementChild).toHaveStyle({
			top: "calc(var(--dungeon-tile-size) * -1)",
			left: "calc(var(--dungeon-tile-size) * -1)",
		});
		// Two tiles in view: two windows.
		rerender(
			<DungeonLayout {...props} visible={seen(["1:2", "2:2", "4:1"])} />,
		);
		expect(drawings(container)).toHaveLength(2);
		rerender(<DungeonLayout {...props} visible={seen(["4:1"])} />);
		expect(drawings(container)).toHaveLength(0);
	});
});
