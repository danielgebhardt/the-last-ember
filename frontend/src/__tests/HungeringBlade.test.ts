// @vitest-environment node
import { describe, expect, it } from "vitest";
import { emptyCombatTelemetry } from "../domain/game/CombatTelemetry";
import { createGameState, type GameState } from "../domain/game/GameState";
import { damageMonster } from "../domain/game/MonsterDamage";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { BOUND_BLADE_REFUSAL } from "../domain/items/HungeringBlade";
import {
	ITEM_DEFINITIONS,
	RARE_EQUIPMENT_KINDS,
	validateItemDefinition,
} from "../domain/items/Item";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { TOWN_EQUIPMENT_OFFERS } from "../domain/town/TownEquipmentStock";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { rareEquipmentAdventure } from "./RareEquipmentTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";

const blade = { id: "blade", kind: "hungering-blade" as const };
const scroll = { id: "scroll", kind: "remove-curse-scroll" as const };
// A quiet corridor with the blade and a Remove Curse scroll in the bag.
const quiet = (): GameState => {
	const base = createGameState(createCorridorEncounter());
	return {
		...base,
		player: { health: 20, maxHealth: 20 },
		monsters: [],
		bag: { items: [...base.bag.items, blade, scroll] },
	};
};
const act = (
	state: GameState,
	action: Parameters<typeof resolvePlayerAction>[1],
) => resolvePlayerAction(state, action);
const wield = (state: GameState) =>
	act(state, { type: "equip", itemId: blade.id, slot: "mainHand" }).state;
const wait = (state: GameState, turns: number) => {
	let next = state;
	for (let turn = 0; turn < turns; turn++)
		next = act(next, { type: "wait" }).state;
	return next;
};

describe("Hungering Blade", () => {
	it("binds when wielded, refusing to be unequipped or replaced", () => {
		const bound = wield(quiet());
		expect(bound.equipment.mainHand).toEqual(blade);
		expect(bound.hunger).toEqual({ fedTurn: bound.turn });
		const unequip = act(bound, { type: "unequip", slot: "mainHand" });
		expect(unequip.error).toBe(BOUND_BLADE_REFUSAL);
		expect(unequip.turnAdvanced).toBe(false);
		const sword = { id: "sword", kind: "iron-sword" as const };
		const replace = act(
			{ ...bound, bag: { items: [...bound.bag.items, sword] } },
			{ type: "equip", itemId: sword.id, slot: "mainHand" },
		);
		expect(replace.error).toBe(BOUND_BLADE_REFUSAL);
	});

	it("drains 1 health every 15 turns without a kill, never the last, and a kill sates it", () => {
		const bound = wield({
			...quiet(),
			combatTelemetry: emptyCombatTelemetry(),
		});
		expect(wait(bound, 30).combatTelemetry?.floors[1]?.damage.blade).toBe(2);
		expect(wait(bound, 14).player.health).toBe(20);
		expect(wait(bound, 15).player.health).toBe(19);
		expect(wait(bound, 30).player.health).toBe(18);
		const starving = wait(
			{ ...bound, player: { health: 1, maxHealth: 20 } },
			30,
		);
		expect(starving.player.health).toBe(1);
		const later = wait(bound, 10);
		const fed = damageMonster(
			{
				...later,
				monsters: [
					{
						id: "1:1",
						kind: "goblin",
						floorNumber: 1,
						coordinate: { row: 1, col: 9 },
						health: 1,
						intent: { type: "idle" },
					},
				],
			},
			{
				id: "1:1",
				kind: "goblin",
				floorNumber: 1,
				coordinate: { row: 1, col: 9 },
				health: 1,
				intent: { type: "idle" },
			},
			5,
			{ type: "player-hit" },
		);
		expect(fed.hunger).toEqual({ fedTurn: later.turn });
		expect(wait(fed, 10).player.health).toBe(20);
	});

	it("never binds by itself on pickup, and a Remove Curse scroll frees it for a turn", () => {
		const bound = wield(quiet());
		const read = act(bound, { type: "consume", itemId: scroll.id });
		expect(read.turnAdvanced).toBe(true);
		expect(read.state.hunger).toBeUndefined();
		expect(read.state.bag.items.some((i) => i.id === scroll.id)).toBe(false);
		const freed = act(read.state, { type: "unequip", slot: "mainHand" });
		expect(freed.error).toBeUndefined();
		expect(freed.state.equipment.mainHand).toBeNull();
		// Unbound, a Remove Curse scroll with nothing to lift stays free and unread.
		expect(
			act(quiet(), { type: "consume", itemId: scroll.id }).turnAdvanced,
		).toBe(false);
	});

	it("saves its binding only on a wielded blade fed no later than now", () => {
		const base = rareEquipmentAdventure("warding-cloak", "town");
		// The weapons store's copy, bought and wielded.
		const bought = {
			id: "town-gear:weapons:hungering-blade:0:1",
			kind: blade.kind,
		};
		const bound = {
			...base,
			equipment: { ...base.equipment, mainHand: bought },
			townEquipmentPurchases: [bought.id],
			townEquipmentStock: base.townEquipmentStock.filter(
				(item) => item.id !== bought.id,
			),
			hunger: { fedTurn: base.turn },
		};
		const save = (state: GameState) =>
			parseSave(serializeSave(tacticalSnapshot(state)));
		const parsed = save(bound);
		if (!parsed.ok) throw new Error(parsed.error);
		expect(restoreSave(parsed.value).state.hunger).toEqual(bound.hunger);
		expect(
			save({
				...bound,
				equipment: base.equipment,
				bag: { items: [...base.bag.items, bought] },
			}).ok,
		).toBe(false);
		expect(save({ ...bound, hunger: { fedTurn: base.turn + 1 } }).ok).toBe(
			false,
		);
	});

	it("is a rare with one weapons-store copy", () => {
		expect(RARE_EQUIPMENT_KINDS).toContain("hungering-blade");
		expect(() =>
			validateItemDefinition(ITEM_DEFINITIONS["hungering-blade"]),
		).not.toThrow();
		const offers = Object.values(TOWN_EQUIPMENT_OFFERS).filter(
			(offer) => offer.item.kind === "hungering-blade",
		);
		expect(offers).toHaveLength(1);
		expect(offers[0]).toMatchObject({ store: "weapons", price: 1400 });
	});
});
