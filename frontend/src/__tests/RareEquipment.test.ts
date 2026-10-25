// @vitest-environment node

import { expect, it } from "vitest";
import { hasLineOfSight } from "../domain/dungeon/Visibility";
import {
	deriveCombatStats,
	resolveIncomingDamage,
} from "../domain/game/CombatStats";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createEquipment } from "../domain/items/Equipment";
import { compareEquipment } from "../domain/items/EquipmentComparison";
import {
	eligibleLootKinds,
	isRareEquipmentKind,
	RARE_EQUIPMENT_KINDS,
} from "../domain/items/Item";
import { availableItemLocations } from "../domain/items/ItemPlacement";
import { itemArmor, itemMagicResistance } from "../domain/items/ItemValues";
import { rareFindId } from "../domain/items/RareFinds";
import { sellCarriedEquipment } from "../domain/merchant/EquipmentSales";
import { lowerEquipmentSale } from "../domain/merchant/LowerEquipmentSales";
import { chooseEnemySpell } from "../domain/monsters/EnemyCasting";
import { resolveMonsterArea } from "../domain/monsters/MonsterAreaAttack";
import { orthogonalDistance } from "../domain/monsters/MonsterLocations";
import { springTrap } from "../domain/objects/DungeonTraps";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import {
	TOWN_EQUIPMENT_OFFERS,
	townEquipmentOffers,
} from "../domain/town/TownEquipmentStock";
import { createTownLocation } from "../domain/town/TownLocation";
import { predictableAttackRolls } from "./ControlledCombatTestHelpers";
import { createComparisonContext } from "./EquipmentComparisonTestHelpers";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { rareEquipmentAdventure } from "./RareEquipmentTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";

it("adds both explicit MR bonuses once, caps with INT and never enchants MR", () => {
	const equipment = createEquipment(
		null,
		{ id: "shield", kind: "spellguard-shield", enchantment: 3 },
		{ id: "cloak", kind: "warding-cloak", enchantment: 3 },
	);
	expect(deriveCombatStats(equipment, { experience: 0 })).toMatchObject({
		magicResistance: 25,
		magicResistanceEquipmentBonus: 20,
		armor: 8,
	});
	expect(
		deriveCombatStats(equipment, {
			experience: 0,
			permanentAttributes: { strength: 0, dexterity: 0, intelligence: 200 },
		}).magicResistance,
	).toBe(50);
});
it("protects an MR sidegrade from Lower classification even at the effective cap", () => {
	const context = createComparisonContext(
		createEquipment(null, null, { id: "armor", kind: "plate-armor" }),
		{
			progression: {
				experience: 0,
				permanentAttributes: { strength: 0, dexterity: 0, intelligence: 200 },
			},
		},
	);
	expect(
		compareEquipment({ id: "cloak", kind: "warding-cloak" }, context)?.label,
	).toBe("Tradeoff");
});
// The armor store's one copy of a rare kind.
const townOfferId = (kind: string) => {
	const id = Object.keys(TOWN_EQUIPMENT_OFFERS).find(
		(offer) => TOWN_EQUIPMENT_OFFERS[offer].item.kind === kind,
	);
	if (!id) throw new Error(`Expected a town offer of ${kind}`);
	return id;
};
const roundTrip = (state: GameState) => {
	const parsed = parseSave(serializeSave(tacticalSnapshot(state)));
	expect(parsed.ok, parsed.ok ? "" : parsed.error).toBe(true);
	if (!parsed.ok) throw new Error(parsed.error);
	return restoreSave(parsed.value).state;
};
const ownsRare = (state: GameState) =>
	[
		...state.floorItems.map((i) => i.item),
		...state.bag.items,
		...Object.values(state.equipment).filter((i) => i !== null),
	].filter((i) => isRareEquipmentKind(i.kind));
it.each(["warding-cloak", "spellguard-shield"] as const)(
	"keeps seeded %s dungeon supply separate from universal finite town stock",
	(kind) => {
		for (const source of ["town", "dungeon"] as const) {
			const state = rareEquipmentAdventure(kind, source);
			// The dungeon copy is this seed's per-third find; the town copy is separate.
			expect(ownsRare(state).filter((i) => i.kind === kind)).toEqual(
				source === "dungeon" ? [{ id: rareFindId(kind), kind }] : [],
			);
			expect(eligibleLootKinds(5, "found")).not.toContain(kind);
			expect(eligibleLootKinds(20, "drop")).not.toContain(kind);
			expect(
				state.townEquipmentStock.filter((i) => isRareEquipmentKind(i.kind)),
			).toHaveLength(RARE_EQUIPMENT_KINDS.length);
			expect(
				townEquipmentOffers().filter((o) => isRareEquipmentKind(o.item.kind)),
			).toHaveLength(RARE_EQUIPMENT_KINDS.length);
			roundTrip(state);
		}
	},
);
it.each(["warding-cloak", "spellguard-shield"] as const)(
	"continues %s pickup, enchant, equip, drop and sale without changing MR or recreating it",
	(kind) => {
		let state = rareEquipmentAdventure(kind, "dungeon");
		const item = ownsRare(state)[0];
		const placed = state.floorItems.find((i) => i.item.id === item.id);
		if (!placed) throw new Error("Missing rare placement");
		state = {
			...state,
			run: {
				...state.run,
				activeFloor: placed.floorNumber,
				playerCoordinate: placed.coordinate,
			},
			monsters: [],
		};
		state = resolvePlayerAction(roundTrip(state), {
			type: "pickup",
			itemId: item.id,
		}).state;
		const slot = kind === "warding-cloak" ? "chest" : "offHand";
		if (!state.equipment[slot] || state.equipment[slot]?.id !== item.id)
			state = resolvePlayerAction(state, {
				type: "equip",
				itemId: item.id,
				slot,
			}).state;
		expect(
			deriveCombatStats(state.equipment, state.progression).magicResistance,
		).toBe(15);
		state = {
			...state,
			bag: {
				items: [
					...state.bag.items,
					{ id: "test:enchant", kind: "enchantment-scroll" },
				],
			},
		};
		state = resolvePlayerAction(state, {
			type: "enchant",
			scrollId: "test:enchant",
			targetItemId: item.id,
		}).state;
		expect(state.equipment[slot]?.enchantment).toBe(1);
		expect(itemArmor(state.equipment[slot])).toBe(2);
		expect(itemMagicResistance(state.equipment[slot])).toBe(10);
		state = roundTrip(state);
		state = resolvePlayerAction(state, { type: "unequip", slot }).state;
		expect(
			deriveCombatStats(state.equipment, state.progression).magicResistance,
		).toBe(5);
		state = resolvePlayerAction(state, { type: "drop", itemId: item.id }).state;
		state = roundTrip(state);
		state = resolvePlayerAction(state, {
			type: "pickup",
			itemId: item.id,
		}).state;
		if (state.equipment[slot]?.id === item.id)
			state = resolvePlayerAction(state, { type: "unequip", slot }).state;
		const sold = sellCarriedEquipment(state, item.id);
		if ("error" in sold) throw new Error(sold.error);
		state = roundTrip(sold);
		expect(ownsRare(state)).toHaveLength(0);
		expect(
			resolvePlayerAction(state, { type: "pickup", itemId: item.id })
				.turnAdvanced,
		).toBe(false);
	},
);
it.each(["warding-cloak", "spellguard-shield"] as const)(
	"stocks %s for 900 gold once and never restocks after sale/reload",
	(kind) => {
		let state = rareEquipmentAdventure(kind, "town");
		state = {
			...state,
			gold: 1200,
			town: { ...createTownLocation(), coordinate: { row: 13, col: 7 } },
		};
		const id = townOfferId(kind);
		expect(TOWN_EQUIPMENT_OFFERS[id].price).toBe(900);
		const rejected = resolvePlayerAction(
			{ ...state, gold: 899 },
			{ type: "buy-town-equipment", offerId: id },
		);
		expect(rejected.turnAdvanced).toBe(false);
		expect(rejected.state.townEquipmentPurchases).not.toContain(id);
		const bought = resolvePlayerAction(roundTrip(state), {
			type: "buy-town-equipment",
			offerId: id,
		});
		expect(bought.error).toBeUndefined();
		expect(bought.turnAdvanced).toBe(false);
		expect(bought.state.gold).toBe(300);
		expect(bought.state.townEquipmentPurchases).toContain(id);
		const sold = sellCarriedEquipment(bought.state, id);
		if ("error" in sold) throw new Error(sold.error);
		state = roundTrip(sold);
		expect(ownsRare(state).filter((i) => i.id === id)).toEqual([]);
		expect(
			townEquipmentOffers().filter((o) => isRareEquipmentKind(o.item.kind)),
		).toHaveLength(RARE_EQUIPMENT_KINDS.length);
		expect(
			resolvePlayerAction(state, { type: "buy-town-equipment", offerId: id })
				.state,
		).toBe(state);
	},
);
it("keeps MR sidegrades out of bulk-sale quotes and preserves ordinary physical damage", () => {
	const state = rareEquipmentAdventure("warding-cloak", "dungeon");
	const equipment = createEquipment(
		null,
		{ id: "iron", kind: "iron-shield" },
		{ id: "plate", kind: "plate-armor" },
	);
	const bag = {
		items: [
			{ id: "cloak", kind: "warding-cloak" as const },
			{ id: "shield", kind: "spellguard-shield" as const },
		],
	};
	expect(lowerEquipmentSale({ ...state, equipment, bag }).items).toEqual([]);
	expect(
		lowerEquipmentSale({
			...state,
			equipment,
			bag,
			progression: {
				experience: 0,
				permanentAttributes: { strength: 0, dexterity: 0, intelligence: 200 },
			},
		}).items,
	).toEqual([]);
	const without = createEquipment(null, { id: "wood", kind: "wooden-shield" });
	const withMR = createEquipment(null, {
		id: "shield",
		kind: "spellguard-shield",
	});
	expect(
		resolveIncomingDamage(
			10,
			deriveCombatStats(without, state.progression).armor,
		),
	).toBe(
		resolveIncomingDamage(
			10,
			deriveCombatStats(withMR, state.progression).armor,
		),
	);
	const monster = {
		id: "5:1",
		kind: "cultist" as const,
		floorNumber: 5,
		coordinate: { row: 1, col: 1 },
		health: 16,
		intent: { type: "idle" as const },
	};
	expect(
		chooseEnemySpell(
			{ ...state, turn: 1, equipment: withMR, difficulty: 1.25 },
			monster,
			predictableAttackRolls,
		),
	).toEqual({ type: "damage", spell: "ember-bolt", damage: 5 });
});
it("rejects forged IDs, duplicate rare copies and restored stock", () => {
	const state = rareEquipmentAdventure("warding-cloak", "dungeon");
	const doc = tacticalSnapshot(state);
	const item = ownsRare(state)[0];
	const cases = [
		{
			...doc,
			state: { ...doc.state, bag: { items: [{ ...item, id: "forged" }] } },
		},
		{ ...doc, state: { ...doc.state, bag: { items: [item] } } },
		{
			...doc,
			state: {
				...doc.state,
				townEquipmentPurchases: doc.state.townEquipmentStock.map((i) => i.id),
			},
		},
	];
	for (const invalid of cases)
		expect(parseSave(JSON.stringify(invalid)).ok).toBe(false);
});

it("mitigates breath once while leaving physical hits, poison application/ticks and traps unchanged", () => {
	const state = {
		...createGameState(createCorridorEncounter()),
		monsters: [],
		objects: [],
	};
	const ordinary = createEquipment(
		null,
		{ id: "wood", kind: "wooden-shield" },
		{ id: "leather", kind: "leather-armor" },
	);
	const rare = createEquipment(
		null,
		{ id: "shield", kind: "spellguard-shield" },
		{ id: "cloak", kind: "warding-cloak" },
	);
	const actor = {
		id: "1:1",
		floorNumber: 1,
		coordinate: { row: 1, col: 2 },
		kind: "spider" as const,
		health: 8,
		intent: { type: "idle" as const },
		// Web on cooldown so this phase isolates the poison bite.
		telegraphTurn: { web: state.turn },
	};
	const ordinaryHit = resolvePlayerAction(
		{ ...state, equipment: ordinary, monsters: [actor] },
		{ type: "wait" },
		predictableAttackRolls,
	).state;
	const rareHit = resolvePlayerAction(
		{ ...state, equipment: rare, monsters: [actor] },
		{ type: "wait" },
		predictableAttackRolls,
	).state;
	expect(rareHit.player).toEqual(ordinaryHit.player);
	expect(rareHit.afflictions).toEqual(ordinaryHit.afflictions);
	expect(rareHit.afflictions.some((a) => a.kind === "poisoned")).toBe(true);
	expect(
		resolvePlayerAction({ ...rareHit, monsters: [] }, { type: "wait" }).state
			.player,
	).toEqual(
		resolvePlayerAction({ ...ordinaryHit, monsters: [] }, { type: "wait" })
			.state.player,
	);
	const trap = {
		id: "floor:1:object:trap:1",
		kind: "trap" as const,
		floorNumber: 1,
		coordinate: { row: 1, col: 1 },
		activated: false,
	};
	expect(springTrap({ ...state, equipment: rare }, trap).player).toEqual(
		springTrap({ ...state, equipment: ordinary }, trap).player,
	);
	const breath = {
		...actor,
		kind: "salamander" as const,
		intent: {
			type: "preparing-area" as const,
			target: state.run.playerCoordinate,
			remaining: 1,
			radius: 1 as const,
			element: "fire" as const,
		},
	};
	expect(
		resolveMonsterArea(
			{ ...state, equipment: rare, difficulty: 1.25 },
			breath,
			predictableAttackRolls,
		)?.damage,
	).toBe(8);
	expect(
		resolveMonsterArea(
			{ ...state, equipment: ordinary, difficulty: 1.25 },
			breath,
			predictableAttackRolls,
		)?.damage,
	).toBe(10);
});
it("continues combat deterministically after saving equipped MR gear", () => {
	let state = rareEquipmentAdventure("warding-cloak", "dungeon");
	const id = rareFindId("warding-cloak");
	const floor = state.run.floors[0];
	const tiles = availableItemLocations(state.run, floor, []);
	const player = tiles.find((p) =>
		tiles.some(
			(q) =>
				orthogonalDistance(p, q) >= 2 &&
				orthogonalDistance(p, q) <= 4 &&
				hasLineOfSight(floor.terrain, p, q),
		),
	);
	if (!player) throw new Error("Missing encounter space");
	const coordinate = tiles.find(
		(q) =>
			orthogonalDistance(player, q) >= 2 &&
			orthogonalDistance(player, q) <= 4 &&
			hasLineOfSight(floor.terrain, player, q),
	);
	if (!coordinate) throw new Error("Missing caster position");
	state = {
		...state,
		turn: 0,
		run: { ...state.run, activeFloor: 1, playerCoordinate: player },
		objects: [],
		monsters: [
			{
				id: "1:1",
				kind: "cultist",
				floorNumber: 1,
				coordinate,
				health: 16,
				intent: { type: "idle" },
			},
		],
		player: { health: 7, maxHealth: 10 },
		floorItems: state.floorItems.filter((i) => i.item.id !== id),
		equipment: { ...state.equipment, chest: { id, kind: "warding-cloak" } },
	};
	const replay = roundTrip(state);
	for (const action of [
		{ type: "wait" as const },
		{ type: "cast" as const, spell: "heal" as const },
	])
		expect(tacticalSnapshot(resolvePlayerAction(replay, action).state)).toEqual(
			tacticalSnapshot(resolvePlayerAction(state, action).state),
		);
});
