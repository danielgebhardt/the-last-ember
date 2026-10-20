// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createAdventureSession } from "../components/game/useAdventureSession";
import { generateDungeonRun } from "../domain/dungeon/DungeonRun";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createBag } from "../domain/items/Bag";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	saveSummary,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { TOWN } from "../domain/town/TownDefinition";
import { createTownLocation } from "../domain/town/TownLocation";
import { COMPACT_TEST_CONFIGURATION as config } from "./TestRunConfiguration";

const dungeonState = () => createGameState(generateDungeonRun(123, 5, config));
const travel = (
	state: ReturnType<typeof dungeonState>,
	destination: "town" | "dungeon",
) => resolvePlayerAction(state, { type: "travel", destination });

describe("deliberate town travel", () => {
	it("starts a fresh adventure in the authored town while retaining a positive-floor dungeon", () => {
		const session = createAdventureSession(
			123,
			config,
			DEFAULT_FOG_CONFIGURATION,
		);
		expect(session.state.town).toEqual(createTownLocation());
		expect(session.state.run.activeFloor).toBe(1);
		expect(session.state.run.floors).toHaveLength(5);
		expect(session.state.run.playerCoordinate).toEqual(
			session.state.quest.entrance,
		);
	});
	it("requires the actual entrance and explicit travel, then preserves the entire played dungeon and resources", () => {
		const original = dungeonState();
		const state = {
			...original,
			turn: 29,
			gold: 17,
			mana: 2,
			player: { ...original.player, health: 4 },
			effects: [
				{
					kind: "poisoned" as const,
					remaining: 3,
					actorId: "player",
					floorNumber: null,
				},
			],
		};
		const entered = travel(state, "town");
		expect(entered.turnAdvanced).toBe(false);
		expect(entered.state).toEqual({ ...state, town: createTownLocation() });
		expect(entered.state.run).toBe(state.run);
		expect(travel(entered.state, "dungeon").state).toBe(entered.state); // not yet at the gate
		const onGate = {
			...entered.state,
			town: { ...createTownLocation(), coordinate: { ...TOWN.gate } },
		};
		const returned = travel(onGate, "dungeon");
		expect(returned.state).toEqual(state);
		expect(returned.turnAdvanced).toBe(false);
		expect(returned.state.monsters).toBe(state.monsters);
		expect(returned.state.floorItems).toBe(state.floorItems);
		expect(returned.state.merchantStock).toBe(state.merchantStock);
	});
	it("does not advance effects, monsters or recovery while walking, waiting or inspecting town", () => {
		const state = {
			...dungeonState(),
			town: createTownLocation(),
			turn: 29,
			mana: 1,
		};
		const moved = resolvePlayerAction(state, {
			type: "move",
			direction: "down",
		});
		expect(moved.state.town?.coordinate).toEqual({ row: 18, col: 12 });
		expect(moved.state.run).toBe(state.run);
		expect(moved.state.turn).toBe(29);
		expect(moved.state.mana).toBe(1);
		const gate = resolvePlayerAction(moved.state, {
			type: "move",
			direction: "down",
		});
		expect(gate.state.town?.coordinate).toEqual(TOWN.gate);
		expect(resolvePlayerAction(gate.state, { type: "wait" }).state).toBe(
			gate.state,
		);
		expect(
			resolvePlayerAction(gate.state, { type: "inspect-town" }).turnAdvanced,
		).toBe(false);
		expect(
			resolvePlayerAction(gate.state, { type: "cast", spell: "heal" }).error,
		).toBeDefined();
		expect(
			resolvePlayerAction(gate.state, {
				type: "exit-dungeon",
				itemId: "anything",
			}).error,
		).toBeDefined();
	});
	it("equips gear and drinks potions in town without spending a turn", () => {
		const base = dungeonState();
		const state = {
			...base,
			town: createTownLocation(),
			turn: 29,
			bag: createBag([
				{ id: "sword", kind: "iron-sword" },
				{ id: "wits", kind: "intelligence-potion" },
			]),
		};
		const equipped = resolvePlayerAction(state, {
			type: "equip",
			itemId: "sword",
			slot: "mainHand",
		});
		expect(equipped.error).toBeUndefined();
		expect(equipped.turnAdvanced).toBe(false);
		expect(equipped.state.equipment.mainHand?.id).toBe("sword");
		const drunk = resolvePlayerAction(equipped.state, {
			type: "consume",
			itemId: "wits",
		});
		expect(drunk.error).toBeUndefined();
		expect(drunk.turnAdvanced).toBe(false);
		expect(drunk.state.progression.permanentAttributes?.intelligence).toBe(1);
		expect(drunk.state.bag.items.map((item) => item.id)).not.toContain("wits");
		const unequipped = resolvePlayerAction(drunk.state, {
			type: "unequip",
			slot: "mainHand",
		});
		expect(unequipped.state.equipment.mainHand).toBeNull();
		expect(unequipped.state.turn).toBe(29);
		expect(unequipped.state.monsters).toBe(state.monsters);
		expect(unequipped.state.town).toBe(state.town);
	});
	it("rejects wrong floors, distant entrances, ended games, ember carriers and occupied/blocked arrivals", () => {
		const state = dungeonState();
		for (const invalid of [
			{ ...state, run: { ...state.run, activeFloor: 2 } },
			{ ...state, run: { ...state.run, playerCoordinate: { row: 0, col: 0 } } },
			{ ...state, player: { ...state.player, health: 0 } },
			{ ...state, quest: { ...state.quest, cureRecovered: true } },
		])
			expect(travel(invalid, "town").state).toBe(invalid);
		const town = {
			...state,
			town: { ...createTownLocation(), coordinate: { ...TOWN.gate } },
		};
		const occupied = {
			...town,
			monsters: [
				{
					...state.monsters[0],
					floorNumber: 1,
					health: 1,
					coordinate: { ...state.quest.entrance },
				},
			],
		};
		expect(travel(occupied, "dungeon").state).toBe(occupied);
		const blocked = {
			...town,
			objects: [
				{
					id: "blocking-door",
					kind: "door" as const,
					floorNumber: 1,
					coordinate: { ...state.quest.entrance },
					activated: false,
				},
			],
		};
		expect(travel(blocked, "dungeon").state).toBe(blocked);
	});
	it("saves town position and retained dungeon ownership, and restores a valid round trip", () => {
		const session = createAdventureSession(
			123,
			config,
			DEFAULT_FOG_CONFIGURATION,
		);
		const state = {
			...session.state,
			town: { ...createTownLocation(), coordinate: { ...TOWN.gate } },
		};
		const doc = createSaveDocument(
			state,
			session.exploration,
			config,
			session.fog,
		);
		expect(saveSummary(doc)).toContain("Town");
		const parsed = parseSave(serializeSave(doc));
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) throw new Error(parsed.error);
		const loaded = restoreSave(parsed.value);
		expect(loaded.state).toEqual(state);
		expect(loaded.exploration.explored).toEqual(session.exploration.explored);
		expect(travel(loaded.state, "dungeon").state).toEqual({
			...state,
			town: null,
		});
	});
	it("rejects malformed, ended or ember-carrying town saves and historical claims of town ownership", () => {
		const session = createAdventureSession(
			123,
			config,
			DEFAULT_FOG_CONFIGURATION,
		);
		const doc = createSaveDocument(
			session.state,
			session.exploration,
			config,
			session.fog,
		);
		for (const bad of [
			{ ...doc, version: 22 },
			{
				...doc,
				state: {
					...doc.state,
					town: { ...doc.state.town, layoutId: "unknown" },
				},
			},
			{
				...doc,
				state: {
					...doc.state,
					town: { ...doc.state.town, coordinate: { row: 0, col: 0 } },
				},
			},
			{
				...doc,
				state: { ...doc.state, player: { ...doc.state.player, health: 0 } },
			},
			{
				...doc,
				state: { ...doc.state, run: { ...doc.state.run, activeFloor: 2 } },
			},
		])
			expect(parseSave(JSON.stringify(bad)).ok).toBe(false);
	});
});
