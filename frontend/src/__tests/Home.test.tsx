import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as DungeonGeneration from "../domain/dungeon/DungeonGeneration.ts";
import { selectPlayerStart } from "../domain/dungeon/DungeonLocations.ts";
import * as DungeonRun from "../domain/dungeon/DungeonRun.ts";
import { FLOOR, WALL } from "../domain/dungeon/Tiles.ts";
import { enterDungeonFromTown } from "./HomeTestHelpers";
import {
	renderHome as render,
	resetHomeTestState,
	stubDungeonRun,
} from "./HomeTestHelpers.tsx";
import Home from "./TestHome";
import {
	createTestDungeonFloor,
	createThreeFloorTraversalRun,
} from "./testhelpers.ts";

afterEach(resetHomeTestState);

describe("Home rendering and movement", () => {
	it("explores without a backend request or server-status footer", async () => {
		const fetch = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(new Response("Hello World!"));
		stubDungeonRun(createThreeFloorTraversalRun());
		const user = userEvent.setup();
		render(<Home />);

		await user.keyboard("{ArrowRight}");
		expect(screen.getByRole("heading", { name: "Floor 2 of 3" })).toBeVisible();
		expect(fetch).not.toHaveBeenCalled();
		expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
		expect(
			screen.queryByText("Failed to load from server"),
		).not.toBeInTheDocument();
	});

	it("groups the title, current depth, and New Dungeon action in the header", () => {
		const run = createThreeFloorTraversalRun();
		stubDungeonRun(run);
		render(<Home />);

		const toolbar = screen.getByRole("banner");
		expect(
			within(toolbar).getByRole("heading", { name: "The Warden's Flame" }),
		).toBeVisible();
		expect(
			within(toolbar).getByRole("heading", { name: "Floor 1 of 3" }),
		).toBeVisible();
		expect(
			within(toolbar).getByRole("button", { name: "New Dungeon" }),
		).toBeVisible();
	});

	it("keeps the map legend out of the play area", () => {
		stubDungeonRun(createThreeFloorTraversalRun());
		render(<Home />);

		expect(screen.getByRole("table", { name: "Dungeon" })).toBeVisible();
		expect(
			screen.queryByRole("list", { name: "Dungeon legend" }),
		).not.toBeInTheDocument();
	});

	it("shows the header and main element", () => {
		render(<Home />);

		expect(
			screen.getByRole("heading", { name: "The Warden's Flame" }),
		).toBeVisible();
		expect(screen.getByRole("main")).toBeVisible();
	});

	it("renders a rectangular generated dungeon on the playable page", () => {
		const generated = DungeonGeneration.generateDungeon({
			rows: 7,
			cols: 11,
			minPartitionSize: 8,
			roomPadding: 1,
			minRoomSize: 3,
			maxRoomAspectRatio: 3,
		});
		vi.spyOn(DungeonGeneration, "generateDungeon").mockReturnValue(generated);

		render(<Home />);

		const dungeon = screen.getByRole("table", { name: "Dungeon" });
		const rows = within(dungeon).getAllByRole("row");

		expect(rows).toHaveLength(7);
		for (const row of rows) {
			expect(within(row).getAllByRole("cell")).toHaveLength(11);
		}
	});

	it("renders the generated terrain in the correct cells", () => {
		const run = DungeonRun.connectDungeonFloors(
			DungeonRun.generateDungeonRun(123, 3, {
				rows: 5,
				cols: 7,
				minPartitionSize: 8,
				roomPadding: 1,
				minRoomSize: 3,
				maxRoomAspectRatio: 3,
			}),
		);

		stubDungeonRun(run);

		render(<Home />);

		const activeFloor = run.floors[run.activeFloor - 1];

		for (const [rowIndex, row] of activeFloor.terrain.entries()) {
			for (const [colIndex, tile] of row.entries()) {
				const isPlayer =
					rowIndex === run.playerCoordinate.row &&
					colIndex === run.playerCoordinate.col;

				const isUpStair =
					activeFloor.upStair?.coordinate.row === rowIndex &&
					activeFloor.upStair.coordinate.col === colIndex;

				const isDownStair =
					activeFloor.downStair?.coordinate.row === rowIndex &&
					activeFloor.downStair.coordinate.col === colIndex;

				if (isPlayer || isUpStair || isDownStair) {
					continue;
				}

				if (tile === WALL) {
					expect(
						screen.getByRole("cell", {
							name: `row${rowIndex}col${colIndex} - wall`,
						}),
					).toBeVisible();
				} else {
					expect(
						screen.getByRole("cell", {
							name: `row${rowIndex}col${colIndex} - floor`,
						}),
					).toBeVisible();
				}
			}
		}
	});

	it("starts the player at the selected generated floor coordinate", () => {
		const generated = DungeonGeneration.generateDungeon({
			rows: 5,
			cols: 7,
			minPartitionSize: 8,
			roomPadding: 1,
			minRoomSize: 3,
			maxRoomAspectRatio: 3,
		});
		vi.spyOn(DungeonGeneration, "generateDungeon").mockReturnValue(generated);

		render(<Home />);

		const start = selectPlayerStart(generated);
		expect(start).toEqual({ row: 2, col: 3 });
		expect(generated.terrain[start.row][start.col]).toBe(FLOOR);
		expect(
			screen.getByRole("cell", {
				name: `row${start.row}col${start.col} - player`,
			}),
		).toBeVisible();
	});

	it("does not generate another dungeon on an ordinary rerender", () => {
		const generated = DungeonGeneration.generateDungeon({
			rows: 5,
			cols: 7,
			minPartitionSize: 8,
			roomPadding: 1,
			minRoomSize: 3,
			maxRoomAspectRatio: 3,
		});
		const generateSpy = vi
			.spyOn(DungeonGeneration, "generateDungeon")
			.mockReturnValue(generated);

		const { rerender } = render(<Home />);
		const callsAfterMount = generateSpy.mock.calls.length;

		rerender(<Home />);

		expect(generateSpy).toHaveBeenCalledTimes(callsAfterMount);
	});

	it("keeps the player's position on an ordinary rerender", async () => {
		const generated = DungeonGeneration.generateDungeon({
			rows: 5,
			cols: 7,
			minPartitionSize: 8,
			roomPadding: 1,
			minRoomSize: 3,
			maxRoomAspectRatio: 3,
		});
		vi.spyOn(DungeonGeneration, "generateDungeon").mockReturnValue(generated);

		const start = selectPlayerStart(generated);
		expect(start).toEqual({ row: 2, col: 3 });
		expect(generated.terrain[2][4]).toBe(FLOOR);

		const { rerender } = render(<Home />);

		await userEvent.keyboard("{ArrowRight}");
		expect(
			screen.getByRole("cell", { name: "row2col4 - player" }),
		).toBeVisible();

		rerender(<Home />);

		expect(
			screen.getByRole("cell", { name: "row2col4 - player" }),
		).toBeVisible();
	});

	it("uses the replacement terrain for movement and moves only once per keypress", async () => {
		const user = userEvent.setup();
		const first = DungeonGeneration.generateDungeon({
			rows: 5,
			cols: 7,
			minPartitionSize: 8,
			roomPadding: 1,
			minRoomSize: 3,
			maxRoomAspectRatio: 3,
		});
		const second = {
			...first,
			terrain: first.terrain.map((row) => [...row]),
		};

		// This cell was floor in the first dungeon.
		second.terrain[1][3] = WALL;

		const generateSpy = vi
			.spyOn(DungeonGeneration, "generateDungeon")
			.mockReturnValue(first);

		render(<Home />);

		generateSpy.mockReturnValue(second);
		await user.click(screen.getByRole("button", { name: "New Dungeon" }));
		await user.click(screen.getByRole("button", { name: "Start new dungeon" }));
		await enterDungeonFromTown(user);

		await user.keyboard("{ArrowUp}");

		expect(screen.getByRole("cell", { name: "row1col3 - wall" })).toBeVisible();
		expect(
			screen.getByRole("cell", { name: "row2col3 - player" }),
		).toBeVisible();

		await user.keyboard("{ArrowRight}");

		expect(
			screen.getByRole("cell", { name: "row2col3 - entrance" }),
		).toBeVisible();
		expect(
			screen.getByRole("cell", { name: "row2col4 - player" }),
		).toBeVisible();
		expect(
			screen.getByRole("cell", { name: "row2col5 - floor" }),
		).toBeVisible();
	});

	it("applies consecutive direction requests to the latest run within one render batch", () => {
		const run: DungeonRun.DungeonRun = {
			seed: 123,
			activeFloor: 1,
			playerCoordinate: { row: 1, col: 1 },
			floors: [
				createTestDungeonFloor({
					floorNumber: 1,
					rows: 3,
					cols: 6,
					room: { startRow: 1, endRow: 1, startCol: 1, endCol: 4 },
				}),
			],
		};
		stubDungeonRun(run);
		render(<Home />);

		act(() => {
			for (let i = 0; i < 3; i++) {
				window.dispatchEvent(
					new KeyboardEvent("keydown", { key: "ArrowRight" }),
				);
			}
		});

		expect(
			screen.getByRole("cell", { name: "row1col4 - player" }),
		).toBeVisible();
		expect(run.playerCoordinate).toEqual({ row: 1, col: 1 });
	});
});
