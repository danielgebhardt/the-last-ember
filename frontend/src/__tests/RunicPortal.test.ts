// @vitest-environment node
import { expect, it } from "vitest";
import { formatActivityEvent } from "../components/game/ActivityMessages";
import { updateExploration } from "../domain/dungeon/Exploration";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { objectChoices } from "../domain/objects/ObjectChoices";
import { rareDiscoverySelection } from "../domain/objects/RareDiscoveryPlacement";
import {
	PORTAL_EMBER_RESTRICTION,
	portalDestinationFloor,
	portalFloors,
} from "../domain/objects/RunicPortal";
import {
	createSaveDocument,
	parseSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";
import { createTestDungeonFloor } from "./testhelpers";

const FLOORS = 10;
// Ten linked open floors; the player stands at 4,4 on floor 5 beside the portal.
const encounter = (seed = 0, floorNumber = 5): GameState => ({
	...createGameState({
		seed,
		activeFloor: floorNumber,
		playerCoordinate: { row: 4, col: 4 },
		floors: Array.from({ length: FLOORS }, (_, index) =>
			createTestDungeonFloor({
				floorNumber: index + 1,
				rows: 15,
				cols: 15,
				room: { startRow: 1, endRow: 13, startCol: 1, endCol: 13 },
				...(index > 0
					? {
							upStair: {
								coordinate: { row: 1, col: 1 },
								destinationFloor: index,
								arrivalCoordinate: { row: 13, col: 13 },
							},
						}
					: {}),
				...(index < FLOORS - 1
					? {
							downStair: {
								coordinate: { row: 13, col: 13 },
								destinationFloor: index + 2,
								arrivalCoordinate: { row: 1, col: 1 },
							},
						}
					: {}),
			}),
		),
	}),
	monsters: [],
	objects: [portal(floorNumber)],
	floorItems: [
		{
			item: { id: "quest:cure", kind: "cure" },
			floorNumber: FLOORS,
			coordinate: { row: 7, col: 7 },
		},
	],
});
const portal = (floorNumber = 5) => ({
	id: `floor:${floorNumber}:object:runic-portal:1`,
	kind: "runic-portal" as const,
	floorNumber,
	coordinate: { row: 4, col: 5 },
	activated: false,
});
const enter = (state: GameState) =>
	resolvePlayerAction(state, {
		type: "interact",
		objectId: state.objects[0].id,
		choice: "portal-enter",
	});
const saved = (state: GameState) =>
	createSaveDocument(
		state,
		updateExploration(state.run, DEFAULT_FOG_CONFIGURATION.radius),
		{ ...COMPACT_TEST_CONFIGURATION, floorCount: FLOORS },
		DEFAULT_FOG_CONFIGURATION,
		new Date("2026-10-21T12:00:00Z"),
	);
const seedFor = (floor: number) => {
	const { run } = encounter();
	let seed = 0;
	while (portalDestinationFloor({ ...run, seed }, portal()) !== floor) seed++;
	return seed;
};

it("leads to this floor or one of the next four, each equally likely", () => {
	expect(portalFloors(encounter().run, portal())).toEqual([5, 6, 7, 8, 9]);
	// Near the bottom the range stops at the last floor with a way down.
	expect(portalFloors(encounter().run, portal(8))).toEqual([8, 9]);
	const counts = new Map<number, number>();
	const { run } = encounter();
	for (let seed = 0; seed < 2500; seed++) {
		const floor = portalDestinationFloor({ ...run, seed }, portal()) ?? 0;
		counts.set(floor, (counts.get(floor) ?? 0) + 1);
	}
	expect([...counts.keys()].sort()).toEqual([5, 6, 7, 8, 9]);
	for (const count of counts.values())
		expect(Math.abs(count / 2500 - 0.2)).toBeLessThan(0.03);
});

it("sets you down beside a deeper floor's down stair for one turn", () => {
	const seed = seedFor(8);
	const result = enter(encounter(seed));
	expect(result.turnAdvanced).toBe(true);
	const { run } = result.state;
	expect(run.activeFloor).toBe(8);
	// Next to the stair at 13,13, never on it.
	expect(
		Math.abs(run.playerCoordinate.row - 13) +
			Math.abs(run.playerCoordinate.col - 13),
	).toBe(1);
	expect(result.state.objects[0]).toMatchObject({
		activated: true,
		portalDestination: { floorNumber: 8, coordinate: run.playerCoordinate },
	});
	const messages = result.state.activityHistory.entries.map(({ event }) =>
		formatActivityEvent(event),
	);
	expect(messages).toContain(
		"Turn 1 — You step through the Runic Portal and arrive on floor 8, beside its way down. The portal goes dark.",
	);
	expect(
		result.state.activityHistory.entries.some(
			({ event }) => event.type === "floor-changed",
		),
	).toBe(true);
	expect(parseSave(serializeSave(saved(result.state))).ok).toBe(true);
});

it("can lead to this floor's own way down without a floor change", () => {
	const result = enter(encounter(seedFor(5)));
	expect(result.state.run.activeFloor).toBe(5);
	expect(
		result.state.activityHistory.entries.some(
			({ event }) => event.type === "floor-changed",
		),
	).toBe(false);
});

it("is fixed per portal, one use, and refused free while carrying the ember", () => {
	const seed = seedFor(7);
	const first = enter(encounter(seed)).state;
	expect(enter(encounter(seed)).state.run).toEqual(first.run);
	const back = {
		...first,
		run: { ...first.run, activeFloor: 5, playerCoordinate: { row: 4, col: 4 } },
	};
	const again = enter(back);
	expect(again.turnAdvanced).toBe(false);
	expect(again.state).toBe(back);

	const carrying = {
		...encounter(seed),
		quest: { ...encounter(seed).quest, cureRecovered: true },
	};
	const refused = enter(carrying);
	expect(refused.turnAdvanced).toBe(false);
	expect(refused.error).toBe(PORTAL_EMBER_RESTRICTION);
	expect(refused.state).toBe(carrying);
});

it("refuses free when no free tile is left near the stair", () => {
	const seed = seedFor(6);
	const state = encounter(seed);
	const floorItems = [...state.floorItems];
	for (let row = 1; row <= 13; row++)
		for (let col = 1; col <= 13; col++)
			floorItems.push({
				item: { id: `filler:${row}:${col}`, kind: "healing-potion" },
				floorNumber: 6,
				coordinate: { row, col },
			});
	const crowded = { ...state, floorItems };
	const result = enter(crowded);
	expect(result.turnAdvanced).toBe(false);
	expect(result.state).toBe(crowded);
});

it("saves reject a destination that doesn't match the seed", () => {
	const seed = seedFor(8);
	const document = saved(enter(encounter(seed)).state);
	const forged = {
		...document,
		state: {
			...document.state,
			objects: [
				{
					...document.state.objects[0],
					portalDestination: {
						floorNumber: 9,
						coordinate: { row: 12, col: 13 },
					},
				},
			],
		},
	} as typeof document;
	expect(parseSave(serializeSave(forged)).ok).toBe(false);
});

it("previews a way down without naming the floor", () => {
	const [choice] = objectChoices(portal(), encounter());
	expect(choice.description).toContain("up to 4 floors deeper");
	expect(choice.outcomes).toContainEqual({
		text: "Destination unknown",
		tone: "neutral",
	});
});

it("joins the discovery pool from floor 5 and never on the final floor", () => {
	let found = 0;
	for (let seed = 0; seed < 1500; seed++) {
		const choice = rareDiscoverySelection({
			seed,
			floors: Array.from({ length: 6 }, (_, index) => ({
				floorNumber: index + 1,
			})),
		} as Parameters<typeof rareDiscoverySelection>[0]);
		if (choice?.kind !== "runic-portal") continue;
		found++;
		expect(choice.floorNumber).toBe(5);
	}
	expect(found).toBeGreaterThan(0);
});
