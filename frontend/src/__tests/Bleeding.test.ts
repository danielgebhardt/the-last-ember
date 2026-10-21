// @vitest-environment node
import { expect, it } from "vitest";
import { formatActivityEvent } from "../components/game/ActivityMessages";
import { corridorView } from "../domain/game/CorridorTravel";
import { createGameState, type GameState } from "../domain/game/GameState";
import {
	type PlayerAction,
	resolvePlayerAction,
} from "../domain/game/PlayerActions";
import { createMonsterDrop } from "../domain/items/MonsterDrops";
import { MONSTER_DEFINITIONS } from "../domain/monsters/Monster";
import { markFirstRemedySources } from "../domain/monsters/MonsterPlacement";
import { TRAP_BLEEDING_CHANCE } from "../domain/objects/DungeonObject";
import { trapCausesBleeding } from "../domain/objects/DungeonTraps";
import { restoreSave } from "../domain/saves/SaveFormat";
import { createTownLocation } from "../domain/town/TownLocation";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";

const bleeding = { kind: "bleeding" as const, remaining: null, source: "test" };
// A quiet 12-tile corridor with the down stair at its east end.
const corridor = (overrides: Partial<GameState> = {}): GameState => ({
	...createGameState(createCorridorEncounter()),
	monsters: [],
	objects: [],
	afflictions: [bleeding],
	...overrides,
});
const act = (state: GameState, action: PlayerAction) =>
	resolvePlayerAction(state, action);
const right = { type: "move", direction: "right" } as const;
const bleeds = (state: GameState) =>
	state.activityHistory.entries.filter(
		({ event }) =>
			event.type === "player-condition-hit" && event.condition === "bleeding",
	).length;

it("costs 1 HP per successful step and logs each one", () => {
	const once = act(corridor(), right).state;
	expect(once.player.health).toBe(9);
	expect(once.run.playerCoordinate).toEqual({ row: 1, col: 2 });
	const entry = once.activityHistory.entries.at(-1);
	expect(entry && formatActivityEvent(entry.event)).toBe(
		"Turn 1 — You bleed for 1 damage.",
	);
	expect(act(once, right).state.player.health).toBe(8);
	// Healing restores HP but leaves the wound open.
	expect(once.afflictions).toEqual([bleeding]);
});

it("does not bleed on waits, failed moves, attacks or town movement", () => {
	const state = corridor();
	expect(act(state, { type: "wait" }).state.player.health).toBe(10);
	const blocked = act(state, { type: "move", direction: "up" });
	expect(blocked.turnAdvanced).toBe(false);
	expect(blocked.state.player.health).toBe(10);
	const fight = corridor({
		monsters: [
			{
				id: "1:1",
				kind: "giant-rat",
				floorNumber: 1,
				coordinate: { row: 1, col: 2 },
				health: 50,
				intent: { type: "idle" },
				lastDamagedTurn: null,
			},
		],
	});
	const attacked = act(fight, right).state;
	expect(attacked.run.playerCoordinate).toEqual({ row: 1, col: 1 });
	expect(bleeds(attacked)).toBe(0);
	const inTown = corridor({ town: createTownLocation() });
	const walked = (["up", "down", "left", "right"] as const)
		.map((direction) => act(inTown, { type: "move", direction }).state)
		.find((next) => next.town !== inTown.town);
	expect(walked?.player.health).toBe(10);
	expect(walked && bleeds(walked)).toBe(0);
});

it("ticks once for a step onto stairs", () => {
	const state = corridor({
		run: {
			...createCorridorEncounter(),
			playerCoordinate: { row: 1, col: 11 },
		},
	});
	const descended = act(state, right).state;
	expect(descended.run.activeFloor).toBe(2);
	expect(descended.player.health).toBe(9);
	expect(bleeds(descended)).toBe(1);
});

it("a lethal step ends the action before the tile's trap or monsters act", () => {
	const trap = {
		id: "floor:1:object:trap:1",
		kind: "trap" as const,
		floorNumber: 1,
		coordinate: { row: 1, col: 2 },
		activated: false,
	};
	const result = act(
		corridor({ player: { health: 1, maxHealth: 10 }, objects: [trap] }),
		right,
	);
	expect(result.turnAdvanced).toBe(true);
	expect(result.state.player.health).toBe(0);
	expect(result.state.objects[0].activated).toBe(false);
	expect(
		result.state.activityHistory.entries.map(({ event }) => event.type),
	).toEqual(["player-condition-hit", "player-died"]);
});

it("Bandages stop it for one turn; without bleeding they cost nothing", () => {
	const bag = { items: [{ id: "bandage-1", kind: "bandages" as const }] };
	const treated = act(corridor({ bag }), {
		type: "consume",
		itemId: "bandage-1",
	});
	expect(treated.turnAdvanced).toBe(true);
	expect(treated.state.afflictions).toEqual([]);
	expect(treated.state.bag.items).toEqual([]);
	const entry = treated.state.activityHistory.entries.find(
		({ event }) => event.type === "item-cleansed",
	);
	expect(entry && formatActivityEvent(entry.event)).toBe(
		"Turn 1 — You apply Bandages and remove Bleeding. The bleeding stops.",
	);
	expect(act(treated.state, right).state.player.health).toBe(10);
	const unneeded = act(corridor({ bag, afflictions: [] }), {
		type: "consume",
		itemId: "bandage-1",
	});
	expect(unneeded.turnAdvanced).toBe(false);
	expect(unneeded.error).toBe("You are not bleeding.");
});

it("blocks starting a corridor run while it lasts", () => {
	const document = savedAdventure();
	document.state.afflictions = [bleeding];
	const { state, exploration } = restoreSave(document);
	expect(corridorView(state, exploration, true).harmful).toBe(true);
});

it("a sprung trap rolls Bleeding on its own stream at 30%", () => {
	const trap = (id: number) => ({
		id: `floor:1:object:trap:${id}`,
		kind: "trap" as const,
		floorNumber: 1,
		coordinate: { row: 1, col: 2 },
		activated: false,
	});
	const rolls = Array.from({ length: 2000 }, (_, id) =>
		trapCausesBleeding(123, trap(id)),
	);
	const rate = rolls.filter(Boolean).length / rolls.length;
	expect(rate).toBeGreaterThan(TRAP_BLEEDING_CHANCE - 0.04);
	expect(rate).toBeLessThan(TRAP_BLEEDING_CHANCE + 0.04);
	const id = rolls.indexOf(true);
	const sprung = act(
		corridor({ afflictions: [], objects: [trap(id)] }),
		right,
	).state;
	expect(sprung.player.health).toBeLessThan(10);
	expect(sprung.afflictions).toEqual([
		{ kind: "bleeding", remaining: null, source: "trap" },
	]);
	const spared = act(
		corridor({ afflictions: [], objects: [trap(rolls.indexOf(false))] }),
		right,
	).state;
	expect(spared.player.health).toBeLessThan(10);
	expect(spared.afflictions).toEqual([]);
});

it("a successful disarm never causes Bleeding", () => {
	for (let seed = 0; seed < 40; seed++) {
		const trap = {
			id: "floor:1:object:trap:1",
			kind: "trap" as const,
			floorNumber: 1,
			coordinate: { row: 1, col: 2 },
			activated: false,
		};
		const state = corridor({
			afflictions: [],
			objects: [trap],
			run: { ...createCorridorEncounter(), seed },
		});
		const result = act(state, { type: "interact", objectId: trap.id }).state;
		const disarmed = result.activityHistory.entries.some(
			({ event }) => event.type === "trap-disarmed",
		);
		if (disarmed) expect(result.afflictions).toEqual([]);
		else
			expect(result.afflictions.length).toBe(
				trapCausesBleeding(seed, trap) ? 1 : 0,
			);
	}
});

it("wolves bite with a 15% chance and the first wolf drops Bandages", () => {
	expect(MONSTER_DEFINITIONS.wolf.onHitAffliction).toEqual({
		kind: "bleeding",
		chance: 0.15,
	});
	const wolf = (id: string, floorNumber: number) => ({
		id,
		kind: "wolf" as const,
		floorNumber,
		coordinate: { row: 1, col: 1 },
		health: 9,
		intent: { type: "idle" as const },
		lastDamagedTurn: null,
	});
	const [first, second] = markFirstRemedySources([
		wolf("3:1", 3),
		wolf("2:4", 2),
	]);
	expect(second.remedyDrop).toBe(true);
	expect(first.remedyDrop).toBeUndefined();
	expect(createMonsterDrop(1, second)?.item.kind).toBe("bandages");
});

it("continues bleeding after save and load", () => {
	const document = savedAdventure();
	document.state.afflictions = [bleeding];
	document.state.monsters = [];
	const { state } = restoreSave(document);
	expect(state.afflictions).toEqual([bleeding]);
	const directions = ["up", "down", "left", "right"] as const;
	const moved = directions
		.map((direction) => act(state, { type: "move", direction }))
		.find((result) => result.turnAdvanced && bleeds(result.state) === 1);
	expect(moved?.state.player.health).toBe(state.player.health - 1);
});
