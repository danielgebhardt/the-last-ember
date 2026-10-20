// @vitest-environment node
import { expect, it } from "vitest";
import type { Coordinate } from "../domain/dungeon/DungeonTypes";
import { updateExploration } from "../domain/dungeon/Exploration";
import { FLOOR } from "../domain/dungeon/Tiles";
import {
	corridorStep,
	corridorStopAfterStep,
	corridorView,
} from "../domain/game/CorridorTravel";
import type { GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { navigationRun } from "../domain/objects/NavigationTerrain";
import { quietCorridor, quietRoomRun } from "./CorridorTravelTestHelpers";

const view = (state: GameState, fog = false) =>
	corridorView(state, updateExploration(navigationRun(state), 4), fog);
const carve = (state: GameState, ...tiles: [number, number][]) => ({
	...state,
	run: {
		...state.run,
		floors: state.run.floors.map((floor) => ({
			...floor,
			terrain: floor.terrain.map((row, r) =>
				row.map((tile, c) =>
					tiles.some(([tr, tc]) => tr === r && tc === c) ? FLOOR : tile,
				),
			),
		})),
	},
});

it("allows ordinary known corridor steps and follows a single bend without changing state", () => {
	const state = quietCorridor();
	const before = JSON.stringify(state);
	expect(corridorStep(view(state), "right")).toEqual({ direction: "right" });
	expect(JSON.stringify(state)).toBe(before);
	const bent = carve(
		{ ...state, run: { ...state.run, playerCoordinate: { row: 2, col: 22 } } },
		[1, 22],
		[0, 22],
	);
	expect(corridorStep(view(bent), "right", { row: 2, col: 21 })).toEqual({
		direction: "up",
	});
});
it("stops before blocked terrain, junctions, room mouths and unexplored neighbors", () => {
	const state = quietCorridor();
	expect(corridorStep(view(state), "up")).toEqual({ stop: "blocked" });
	expect(corridorStep(view(carve(state, [1, 5])), "right")).toEqual({
		stop: "junction",
	});
	expect(
		corridorStep(
			view(
				carve(
					{
						...state,
						run: { ...state.run, playerCoordinate: { row: 2, col: 5 } },
					},
					[1, 6],
					[1, 7],
				),
			),
			"right",
		),
	).toEqual({
		stop: "room",
	});
	const projected = view(state);
	const terrain = projected.terrain.map((row) => [...row]);
	terrain[1][5] = undefined;
	expect(corridorStep({ ...projected, terrain }, "right")).toEqual({
		stop: "unexplored",
	});
});
it.each([
	"door",
	"elite-door",
	"trap",
	"chest",
	"gold",
	"merchant",
	"fountain",
] as const)("stops before %s without interacting", (kind) => {
	const state = {
		...quietCorridor(),
		objects: [
			{
				id: "object",
				kind,
				floorNumber: 1,
				coordinate: { row: 2, col: 5 },
				activated: false,
			},
		],
	};
	expect(corridorStep(view(state), "right")).toEqual({ stop: "object" });
	expect(state.objects[0].activated).toBe(false);
});
it("stops before loot, stairs and the entrance, including occupied starting tiles", () => {
	const state = quietCorridor();
	expect(
		corridorStep(
			view({
				...state,
				floorItems: [
					{
						item: { id: "loot", kind: "healing-potion" },
						floorNumber: 1,
						coordinate: { row: 2, col: 5 },
					},
				],
			}),
			"right",
		),
	).toEqual({ stop: "loot" });
	const stair = {
		coordinate: { row: 2, col: 5 },
		destinationFloor: 2,
		arrivalCoordinate: { row: 2, col: 1 },
	};
	const stairs = {
		...state,
		run: {
			...state.run,
			floors: [{ ...state.run.floors[0], downStair: stair }],
		},
	};
	expect(corridorStep(view(stairs), "right")).toEqual({ stop: "landmark" });
	expect(
		corridorStep(
			view({
				...state,
				quest: { ...state.quest, entrance: state.run.playerCoordinate },
			}),
			"right",
		),
	).toEqual({ stop: "landmark" });
});
it("denies harmful conditions and ended adventures, and sees no hidden monster or loot", () => {
	const state = quietCorridor();
	const hidden = {
		...state,
		monsters: [
			{
				id: "hidden",
				kind: "goblin" as const,
				health: 5,
				floorNumber: 1,
				coordinate: { row: 2, col: 18 },
				intent: { type: "idle" as const },
			},
		],
		floorItems: [
			{
				item: { id: "hidden-loot", kind: "healing-potion" as const },
				floorNumber: 1,
				coordinate: { row: 2, col: 18 },
			},
		],
	};
	expect(corridorStep(view(hidden, true), "right")).toEqual(
		corridorStep(view(state, true), "right"),
	);
	expect(corridorStep(view(hidden), "right")).toEqual({ stop: "threat" });
	expect(
		corridorStep(
			view({
				...state,
				effects: [
					{
						actorId: "player",
						floorNumber: null,
						kind: "poisoned",
						remaining: 3,
					},
				],
			}),
			"right",
		),
	).toEqual({ stop: "condition" });
	expect(
		corridorStep(
			view({ ...state, player: { ...state.player, health: 0 } }),
			"right",
		),
	).toEqual({ stop: "ended" });
});
it("stops on newly visible decisions, damage even when healed, conditions and floor changes", () => {
	const before = view(quietCorridor());
	const hitThenHealed = {
		...quietCorridor(),
		turn: 1,
		activityHistory: {
			nextId: 2,
			entries: [
				{
					id: 1,
					event: {
						turn: 1,
						type: "monster-hit" as const,
						monster: "goblin" as const,
						damage: 1,
					},
				},
			],
		},
	};
	expect(corridorStopAfterStep(before, view(hitThenHealed))).toBe("damage");
	const room = view(carve(quietCorridor(), [1, 9], [1, 10]));
	const remembered = {
		...room,
		terrain: room.terrain.map((row) =>
			row.map((tile, col) => (col >= 8 ? undefined : tile)),
		),
	};
	expect(corridorStopAfterStep(remembered, room)).toBe("discovery");

	expect(
		corridorStopAfterStep(before, {
			...before,
			visiblePoints: [...before.visiblePoints, { row: 2, col: 8 }],
			turn: 1,
		}),
	).toBe("discovery");
	expect(
		corridorStopAfterStep(before, { ...before, damaged: true, turn: 1 }),
	).toBe("damage");
	expect(
		corridorStopAfterStep(before, { ...before, harmful: true, turn: 1 }),
	).toBe("condition");
	expect(
		corridorStopAfterStep(before, { ...before, floorNumber: 2, turn: 1 }),
	).toBe("floor");
});
it("resolves every allowed step through the normal turn boundary; denial resolves nothing", () => {
	let state = { ...quietCorridor(), turn: 28, mana: 0 };
	let manual = state;
	for (let i = 0; i < 3; i++) {
		const decision = corridorStep(view(state), "right");
		expect(decision).toEqual({ direction: "right" });
		if ("direction" in decision)
			state = resolvePlayerAction(state, {
				type: "move",
				direction: decision.direction,
			}).state;
		manual = resolvePlayerAction(manual, {
			type: "move",
			direction: "right",
		}).state;
	}
	expect(state).toEqual(manual);
	expect(state.turn).toBe(31);
	expect(state.mana).toBeGreaterThan(0);
	const poisoned = {
		...state,
		effects: [
			{
				actorId: "player",
				floorNumber: null,
				kind: "poisoned" as const,
				remaining: 3,
			},
		],
	};
	expect(corridorStep(view(poisoned), "right")).toEqual({ stop: "condition" });
	expect(poisoned.turn).toBe(31);
});

it("runs straight across a known cleared room into its corridor using ordinary turns", () => {
	let state = quietRoomRun();
	let previous: Coordinate | undefined;
	for (let col = 4; col < 12; col++) {
		expect(state.run.playerCoordinate).toEqual({ row: 2, col });
		expect(corridorStep(view(state), "right", previous)).toEqual({
			direction: "right",
		});
		const before = view(state);
		previous = state.run.playerCoordinate;
		state = resolvePlayerAction(state, {
			type: "move",
			direction: "right",
		}).state;
		expect(corridorStopAfterStep(before, view(state))).toBeUndefined();
	}
	expect(state.turn).toBe(8);
	// Running back from the corridor still stops before entering the room.
	const outside = {
		...state,
		run: { ...state.run, playerCoordinate: { row: 2, col: 9 } },
	};
	expect(corridorStep(view(outside), "left")).toEqual({ stop: "room" });
});
it("stays on the chosen straight line in a room, stops at its wall and still stops at corridor junctions", () => {
	const room = quietRoomRun();
	const atWall = {
		...room,
		run: { ...room.run, playerCoordinate: { row: 1, col: 4 } },
	};
	expect(corridorStep(view(atWall), "up", { row: 2, col: 4 })).toEqual({
		stop: "blocked",
	});
	expect(corridorStep(view(room), "right", { row: 2, col: 3 })).toEqual({
		direction: "right",
	});
	const junction = carve(
		{ ...room, run: { ...room.run, playerCoordinate: { row: 2, col: 9 } } },
		[1, 10],
	);
	expect(corridorStep(view(junction), "right", { row: 2, col: 8 })).toEqual({
		stop: "junction",
	});
});
it.each(["door", "trap", "chest", "fountain"] as const)(
	"room running still stops before a %s without interacting",
	(kind) => {
		const state = {
			...quietRoomRun(),
			objects: [
				{
					id: "decision",
					kind,
					activated: false,
					floorNumber: 1,
					coordinate: { row: 2, col: 5 },
				},
			],
		};
		expect(corridorStep(view(state), "right")).toEqual({ stop: "object" });
		expect(state.objects[0].activated).toBe(false);
	},
);
it("room running still stops for loot, stairs, enemies, poison and unknown terrain", () => {
	const projected = view(quietRoomRun()),
		next = { row: 2, col: 5 };
	expect(corridorStep({ ...projected, items: [next] }, "right")).toEqual({
		stop: "loot",
	});
	expect(corridorStep({ ...projected, landmarks: [next] }, "right")).toEqual({
		stop: "landmark",
	});
	expect(corridorStep({ ...projected, threat: true }, "right")).toEqual({
		stop: "threat",
	});
	expect(corridorStep({ ...projected, harmful: true }, "right")).toEqual({
		stop: "condition",
	});
	const terrain = projected.terrain.map((row) => [...row]);
	terrain[1][5] = undefined;
	expect(corridorStep({ ...projected, terrain }, "right")).toEqual({
		stop: "unexplored",
	});
});
it("stops when Disease begins, but an existing lingering Disease does not forbid running", () => {
	const healthy = quietCorridor();
	const diseased = {
		...healthy,
		afflictions: [
			{ kind: "disease" as const, remaining: null, source: "test" },
		],
	};
	expect(corridorStopAfterStep(view(healthy), view(diseased))).toBe(
		"condition",
	);
	expect(corridorStep(view(diseased), "right")).toEqual({
		direction: "right",
	});
	expect(
		corridorStopAfterStep(view(diseased), { ...view(diseased), turn: 1 }),
	).toBeUndefined();
});
it("stops when Slowed begins and refuses to start while it lasts", () => {
	const healthy = quietCorridor();
	const slowed = {
		...healthy,
		afflictions: [{ kind: "slowed" as const, remaining: 9, source: "web" }],
	};
	expect(corridorStopAfterStep(view(healthy), view(slowed))).toBe("condition");
	expect(corridorStep(view(slowed), "right")).toEqual({ stop: "condition" });
});
it("stops when Mana Burn begins but may run while it lasts", () => {
	const healthy = quietCorridor();
	const burned = {
		...healthy,
		afflictions: [
			{ kind: "mana-burn" as const, remaining: 80, source: "leech" },
		],
	};
	expect(corridorStopAfterStep(view(healthy), view(burned))).toBe("condition");
	expect(corridorStep(view(burned), "right")).toEqual({ direction: "right" });
});
