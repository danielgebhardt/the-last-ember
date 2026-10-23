// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { FLOOR, WALL } from "../domain/dungeon/Tiles";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createTestSeedState } from "../domain/game/TestSeed";
import { coordinateKey } from "../domain/monsters/MonsterLocations";
import type { DungeonObject } from "../domain/objects/DungeonObject";
import { nearbyInteractionObjects } from "../domain/objects/ObjectInteraction";
import { sealedTiles } from "../domain/objects/OptionalEliteRooms";
import {
	isCrackedWall,
	openCrackedWall,
	VAULT_CHANCE,
} from "../domain/objects/SecretVaults";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const adventure = (seed: number) =>
	createGameState(
		connectDungeonFloors(
			generateDungeonRun(seed, 20, COMPACT_TEST_CONFIGURATION),
		),
	);
const SIDES = [
	{ row: -1, col: 0 },
	{ row: 1, col: 0 },
	{ row: 0, col: -1 },
	{ row: 0, col: 1 },
];
const near = (p: { row: number; col: number }) =>
	SIDES.map((d) => ({ row: p.row + d.row, col: p.col + d.col }));
type Floor = GameState["run"]["floors"][number];
const inRoom = (floor: Floor, p: { row: number; col: number }) =>
	floor.rooms.some(
		(r) =>
			p.row >= r.startRow &&
			p.row <= r.endRow &&
			p.col >= r.startCol &&
			p.col <= r.endCol,
	);
// The first generated vault, with the player inside its room beside the wall.
const besideVault = (): { state: GameState; wall: DungeonObject } => {
	for (let seed = 1; seed < 100; seed++) {
		const generated = adventure(seed);
		const wall = generated.objects.find(isCrackedWall);
		if (!wall) continue;
		const floor = generated.run.floors[wall.floorNumber - 1];
		const inside = near(wall.coordinate).find((p) => inRoom(floor, p));
		if (!inside) throw new Error("A vault wall must border its room");
		return {
			wall,
			state: {
				...generated,
				run: {
					...generated.run,
					activeFloor: wall.floorNumber,
					playerCoordinate: inside,
				},
				monsters: generated.monsters.filter(
					(m) => m.floorNumber !== wall.floorNumber,
				),
			},
		};
	}
	throw new Error("Expected a vault within 100 seeds");
};
const wait = (state: GameState) =>
	resolvePlayerAction(state, { type: "wait" }).state;

describe("Secret vaults", () => {
	it("carves a sealed pocket behind a room's side wall, touching nothing else, on about a third of floors", () => {
		let floors = 0,
			vaults = 0;
		for (let seed = 1; seed <= 30; seed++) {
			const state = adventure(seed);
			expect(adventure(seed).objects.filter(isCrackedWall)).toEqual(
				state.objects.filter(isCrackedWall),
			);
			floors += state.run.floors.length - 1;
			for (const wall of state.objects.filter(isCrackedWall)) {
				vaults++;
				expect(wall.floorNumber).toBeGreaterThanOrEqual(2);
				const floor = state.run.floors[wall.floorNumber - 1];
				const pocket = sealedTiles(floor, state.objects);
				expect(pocket.size).toBe(6);
				// Only the cracked wall joins the pocket to the dungeon.
				for (const key of pocket) {
					const [row, col] = key.split(":").map(Number);
					expect(inRoom(floor, { row, col })).toBe(false);
					for (const p of near({ row, col }))
						expect(
							pocket.has(coordinateKey(p)) ||
								coordinateKey(p) === coordinateKey(wall.coordinate) ||
								floor.terrain[p.row][p.col] === WALL,
						).toBe(true);
				}
				// The entrance stays wall terrain until opened.
				expect(floor.terrain[wall.coordinate.row][wall.coordinate.col]).toBe(
					WALL,
				);
				// Its gold and its one item lie inside; nothing else does.
				const inside = (p: { row: number; col: number }) =>
					pocket.has(coordinateKey(p));
				expect(
					state.objects
						.filter(
							(o) => o.floorNumber === wall.floorNumber && inside(o.coordinate),
						)
						.map((o) => o.kind),
				).toEqual(["gold"]);
				expect(
					state.floorItems
						.filter(
							(i) => i.floorNumber === wall.floorNumber && inside(i.coordinate),
						)
						.map((i) => i.item.id),
				).toEqual([`${wall.id}:reward`]);
				expect(
					state.monsters.some(
						(m) => m.floorNumber === wall.floorNumber && inside(m.coordinate),
					),
				).toBe(false);
			}
		}
		expect(vaults / floors).toBeGreaterThan(VAULT_CHANCE / 3);
		expect(vaults / floors).toBeLessThan(VAULT_CHANCE * 1.5);
	});

	it("stays wall until noticed close by, then opens with E for a turn", () => {
		const { state, wall } = besideVault();
		const walled = state.run.floors[wall.floorNumber - 1].terrain;
		expect(walled[wall.coordinate.row][wall.coordinate.col]).toBe(WALL);
		expect(nearbyInteractionObjects(state)).not.toContainEqual(wall);
		const noticed = wait(state);
		const seen = noticed.objects.find((o) => o.id === wall.id);
		expect(seen?.noticed).toBe(true);
		expect(
			noticed.activityHistory.entries.map(({ event }) => event.type),
		).toContain("cracked-wall-noticed");
		const opened = resolvePlayerAction(noticed, {
			type: "interact",
			objectId: wall.id,
		});
		expect(opened.turnAdvanced).toBe(true);
		expect(opened.state.objects.find((o) => o.id === wall.id)?.activated).toBe(
			true,
		);
		const floor = opened.state.run.floors[wall.floorNumber - 1];
		expect(floor.terrain[wall.coordinate.row][wall.coordinate.col]).toBe(FLOOR);
		expect(sealedTiles(floor, opened.state.objects).size).toBe(0);
	});

	it("is never noticed from afar, and nothing is placed or teleported into a sealed vault", () => {
		const { state, wall } = besideVault();
		const floor = state.run.floors[wall.floorNumber - 1];
		const far = floor.rooms
			.flatMap((r) => [
				{ row: r.startRow, col: r.startCol },
				{ row: r.endRow, col: r.endCol },
			])
			.find(
				(p) =>
					Math.hypot(p.row - wall.coordinate.row, p.col - wall.coordinate.col) >
					4,
			);
		if (!far) throw new Error("Expected a distant room tile");
		const away = wait({
			...state,
			run: { ...state.run, playerCoordinate: far },
		});
		expect(away.objects.find((o) => o.id === wall.id)?.noticed).toBeUndefined();
		const pocket = sealedTiles(floor, state.objects);
		for (let turn = 0; turn < 20; turn++) {
			const blinked = resolvePlayerAction(
				{ ...state, turn, mana: 99 },
				{ type: "cast", spell: "blink" },
			).state;
			expect(pocket.has(coordinateKey(blinked.run.playerCoordinate))).toBe(
				false,
			);
		}
	});

	it("saves a noticed wall, and rejects an opened wall never noticed or a noticed non-wall", () => {
		// Saves are checked against the compact five-floor configuration.
		let found: { state: GameState; wall: DungeonObject } | undefined;
		for (let seed = 1; seed < 200 && !found; seed++) {
			const state = createGameState(
				connectDungeonFloors(
					generateDungeonRun(seed, 5, COMPACT_TEST_CONFIGURATION),
				),
			);
			const wall = state.objects.find(isCrackedWall);
			if (wall) found = { state, wall };
		}
		if (!found) throw new Error("Expected a five-floor vault");
		const { state, wall } = found;
		const save = (objects: readonly DungeonObject[]) =>
			parseSave(serializeSave(tacticalSnapshot({ ...state, objects })));
		const mark = (change: Partial<DungeonObject>, id = wall.id) =>
			state.objects.map((o) => (o.id === id ? { ...o, ...change } : o));
		const noticed = save(mark({ noticed: true }));
		if (!noticed.ok) throw new Error(noticed.error);
		expect(
			restoreSave(noticed.value).state.objects.find((o) => o.id === wall.id)
				?.noticed,
		).toBe(true);
		// Opening turns the entrance to floor; an opened wall never noticed is impossible.
		const opened = openCrackedWall(
			{ ...state, objects: mark({ noticed: true }) },
			{ ...wall, noticed: true },
		);
		if ("error" in opened) throw new Error(opened.error);
		expect(parseSave(serializeSave(tacticalSnapshot(opened))).ok).toBe(true);
		expect(
			parseSave(
				serializeSave(
					tacticalSnapshot({
						...opened,
						objects: opened.objects.map((o) =>
							o.id === wall.id ? { ...o, noticed: undefined } : o,
						),
					}),
				),
			).ok,
		).toBe(false);
		// Still wall terrain, so it cannot be recorded as opened.
		expect(save(mark({ noticed: true, activated: true })).ok).toBe(false);
		const other = state.objects.find((o) => !isCrackedWall(o));
		if (!other) throw new Error("Expected another object");
		expect(save(mark({ noticed: true }, other.id)).ok).toBe(false);
	});

	it("always hides a vault on the test seed's first floor", () => {
		const state = createTestSeedState(COMPACT_TEST_CONFIGURATION);
		const wall = state.objects.find(isCrackedWall);
		expect(wall?.floorNumber).toBe(1);
		if (!wall) throw new Error("Expected the test seed's vault");
		expect(
			sealedTiles(state.run.floors[0], state.objects).size,
		).toBeGreaterThan(0);
	});
});
