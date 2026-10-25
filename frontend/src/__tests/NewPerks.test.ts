// @vitest-environment node
import { describe, expect, it } from "vitest";
import { deriveCombatStats } from "../domain/game/CombatStats";
import { createGameState, type GameState } from "../domain/game/GameState";
import { deriveAccuracy } from "../domain/game/MeleeRules";
import {
	arrowWardedDamage,
	executionerBonus,
	haggledPrice,
	haggledSale,
} from "../domain/game/PerkEffects";
import {
	PERK_DEFINITIONS,
	PERK_KINDS,
	PERK_LEVELS,
	type PerkKind,
	perkOffers,
} from "../domain/game/Perks";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { maximumHealth } from "../domain/game/PlayerHealth";
import {
	createProgression,
	type Progression,
} from "../domain/game/Progression";
import { isSpellTarget } from "../domain/game/SpellCasting";
import { playerSpell, SPELL_DEFINITIONS } from "../domain/game/Spells";
import { createBag } from "../domain/items/Bag";
import { createEquipment } from "../domain/items/Equipment";
import { sellCarriedEquipment } from "../domain/merchant/EquipmentSales";
import {
	equipmentSaleGold,
	equipmentSalePrice,
	merchantPrice,
} from "../domain/merchant/MerchantRules";
import type { MonsterKind } from "../domain/monsters/Monster";
import { createTestDungeonFloor } from "./testhelpers";

const NEW_PERKS: readonly PerkKind[] = [
	"executioner",
	"reckless",
	"last-stand",
	"arrow-ward",
	"efficient-casting",
	"long-reach",
	"field-medic",
	"iron-constitution",
	"haggler",
	"pathfinder",
];
const withPerks = (...perks: PerkKind[]): Progression => ({
	...createProgression(),
	experience: 3800,
	perks: perks.map((perk, index) => ({ level: PERK_LEVELS[index], perk })),
});
const none = withPerks();
// One room on floor 2; the monster stands at the given column on the player's row.
const room = (
	kind: MonsterKind,
	col: number,
	health: number,
	progression: Progression,
): GameState => ({
	...createGameState({
		seed: 123,
		activeFloor: 2,
		playerCoordinate: { row: 4, col: 2 },
		floors: [1, 2].map((floorNumber) =>
			createTestDungeonFloor({
				floorNumber,
				rows: 9,
				cols: 11,
				room: { startRow: 1, endRow: 7, startCol: 1, endCol: 9 },
			}),
		),
	}),
	progression,
	floorItems: [],
	monsters: [
		{
			id: "2:1",
			kind,
			floorNumber: 2,
			coordinate: { row: 4, col },
			health,
			intent: { type: "idle" },
		},
	],
});
const hits = () => ({
	d20: () => 20,
	damage: (_min: number, max: number) => max,
});

describe("The larger perk pool", () => {
	it("holds five perks in each family, including the ten added in #408", () => {
		expect(PERK_KINDS).toHaveLength(25);
		expect(PERK_KINDS).toEqual(expect.arrayContaining([...NEW_PERKS]));
		const families = new Map<string, number>();
		for (const perk of PERK_KINDS) {
			const { family } = PERK_DEFINITIONS[perk];
			families.set(family, (families.get(family) ?? 0) + 1);
		}
		expect([...families.values()]).toEqual([5, 5, 5, 5, 5]);
	});

	it("still offers three perks from three families at every level, deterministically", () => {
		for (let seed = 1; seed <= 40; seed += 1) {
			const taken: PerkKind[] = [];
			for (const level of PERK_LEVELS) {
				const offers = perkOffers(seed, level, taken);
				expect(offers).toEqual(perkOffers(seed, level, taken));
				expect(offers).toHaveLength(3);
				expect(
					new Set(offers.map((perk) => PERK_DEFINITIONS[perk].family)).size,
				).toBe(3);
				expect(offers.some((perk) => taken.includes(perk))).toBe(false);
				taken.push(offers[seed % 3]);
			}
			// Nine choices leave sixteen perks, so late offers no longer repeat leftovers.
			expect(PERK_KINDS.length - taken.length).toBe(16);
		}
	});
});

describe("New perk effects", () => {
	it("Executioner adds 3 melee damage below half health only", () => {
		const perk = withPerks("executioner");
		expect(executionerBonus(perk, { health: 4 }, 10)).toBe(3);
		expect(executionerBonus(perk, { health: 5 }, 10)).toBe(0);
		expect(executionerBonus(none, { health: 4 }, 10)).toBe(0);
		const struck = (progression: Progression) =>
			40 -
			(resolvePlayerAction(
				room("zombie", 3, 40, progression),
				{ type: "move", direction: "right" },
				hits,
			).state.monsters[0]?.health ?? 0);
		const wounded = (progression: Progression) =>
			5 -
			(resolvePlayerAction(
				room("zombie", 3, 5, progression),
				{ type: "move", direction: "right" },
				() => ({ d20: () => 20, damage: (min: number) => min }),
			).state.monsters[0]?.health ?? 0);
		expect(struck(perk)).toBe(struck(none));
		expect(wounded(perk)).toBe(Math.min(5, wounded(none) + 3));
	});

	it("Reckless trades 5% evasion for 2 melee damage", () => {
		const equipment = createEquipment();
		const reckless = withPerks("reckless");
		expect(deriveCombatStats(equipment, reckless).attack).toBe(
			deriveCombatStats(equipment, none).attack + 2,
		);
		expect(deriveCombatStats(equipment, reckless).perkAttack).toBe(2);
		expect(deriveAccuracy(reckless).evadeChance).toBe(
			deriveAccuracy(none).evadeChance - 5,
		);
	});

	it("Last stand adds 10% evasion below a quarter of maximum health", () => {
		const perk = withPerks("last-stand");
		const evade = (health: number, progression = perk) =>
			deriveAccuracy(progression, [], undefined, [], {
				health,
				maxHealth: 40,
			}).evadeChance;
		expect(evade(9)).toBe(evade(9, none) + 10);
		expect(evade(10)).toBe(evade(10, none));
		expect(evade(0)).toBe(evade(0, none));
		expect(deriveAccuracy(perk).evadeChance).toBe(
			deriveAccuracy(none).evadeChance,
		);
	});

	it("Arrow ward softens shots, never melee, to a minimum of 1", () => {
		expect(arrowWardedDamage(withPerks("arrow-ward"), 5)).toBe(3);
		expect(arrowWardedDamage(withPerks("arrow-ward"), 2)).toBe(1);
		expect(arrowWardedDamage(none, 5)).toBe(5);
		const taken = (col: number, progression: Progression) => {
			const before = room("goblin-archer", col, 5, progression);
			return (
				before.player.health -
				resolvePlayerAction(before, { type: "wait" }, hits).state.player.health
			);
		};
		// A shot from four tiles away, then a melee strike from beside you.
		expect(taken(6, none)).toBe(2);
		expect(taken(6, withPerks("arrow-ward"))).toBe(1);
		expect(taken(3, withPerks("arrow-ward"))).toBe(taken(3, none));
	});

	it("Efficient casting and Long reach change cost and targeted range only", () => {
		const missile = SPELL_DEFINITIONS["magic-missile"];
		expect(playerSpell("magic-missile", none)).toBe(missile);
		expect(
			playerSpell("magic-missile", withPerks("efficient-casting")),
		).toMatchObject({ cost: missile.cost - 1, range: missile.range });
		expect(playerSpell("magic-missile", withPerks("long-reach"))).toMatchObject(
			{
				cost: missile.cost,
				range: missile.range + 1,
			},
		);
		expect(
			playerSpell("heal", withPerks("efficient-casting", "long-reach")),
		).toEqual({
			...SPELL_DEFINITIONS.heal,
			cost: SPELL_DEFINITIONS.heal.cost - 1,
		});
		expect(playerSpell("blink", withPerks("long-reach"))).toBe(
			SPELL_DEFINITIONS.blink,
		);
		const reach = missile.range + 1;
		const target = (progression: Progression) => {
			const state = room("zombie", 2 + reach, 40, progression);
			return isSpellTarget(
				state,
				state.monsters[0],
				playerSpell("magic-missile", progression),
			);
		};
		expect(target(none)).toBe(false);
		expect(target(withPerks("long-reach"))).toBe(true);
		const cast = (progression: Progression) => {
			const state = {
				...room("zombie", 4, 40, progression),
				knownSpells: ["magic-missile" as const],
				mana: 10,
			};
			return resolvePlayerAction(
				state,
				{ type: "cast", spell: "magic-missile", targetId: "2:1" },
				hits,
			).state.mana;
		};
		expect(cast(withPerks("efficient-casting"))).toBe(cast(none) + 1);
	});

	it("Field medic heals 3 after a remedy cures something, logging it", () => {
		// Level 1, so maximum health stays 10 when the cure recomputes it.
		const medic = {
			...createProgression(),
			perks: [{ level: 3, perk: "field-medic" as const }],
		};
		const plain = createProgression();
		const remedy = (progression: Progression, health: number) => {
			const state = {
				...room("zombie", 8, 40, progression),
				monsters: [],
				player: { health, maxHealth: 10 },
				afflictions: [
					{ kind: "poisoned" as const, remaining: 4, source: "test" },
				],
				bag: createBag([{ id: "antidote", kind: "antidote" }]),
			};
			return resolvePlayerAction(state, { type: "consume", itemId: "antidote" })
				.state;
		};
		const healed = remedy(medic, 5);
		expect(healed.player.health).toBe(8);
		expect(healed.activityHistory.entries.at(0)?.event).toMatchObject({
			type: "item-cleansed",
			recovered: 3,
		});
		expect(remedy(medic, 9).player.health).toBe(10);
		expect(remedy(plain, 5).player.health).toBe(5);
		expect(
			remedy(plain, 5).activityHistory.entries.at(0)?.event,
		).not.toHaveProperty("recovered");
	});

	it("Iron constitution halves Disease's loss of maximum health", () => {
		const equipment = createEquipment();
		const disease = [
			{ kind: "disease" as const, remaining: null, source: "rat" },
		];
		const progression = { ...createProgression(), experience: 0 };
		const iron = {
			...progression,
			perks: [{ level: 3, perk: "iron-constitution" as const }],
		};
		expect(maximumHealth(progression, equipment, disease)).toBe(8);
		expect(maximumHealth(iron, equipment, disease)).toBe(9);
		expect(maximumHealth(iron, equipment)).toBe(10);
	});

	it("Haggler takes 10% off purchases and adds 10% to sales, never more", () => {
		const haggler = withPerks("haggler");
		expect(haggledPrice(haggler, 150)).toBe(135);
		expect(haggledPrice(haggler, 125)).toBe(113);
		expect(haggledSale(haggler, 25)).toBe(27);
		expect(haggledPrice(none, 150)).toBe(150);
		expect(merchantPrice("healing-potion", haggler)).toBe(135);
		const sword = { id: "sword", kind: "iron-sword" as const };
		const base = equipmentSalePrice(sword) as number;
		expect(equipmentSaleGold(sword, haggler)).toBe(Math.floor(base * 1.1));
		expect(
			equipmentSaleGold({ id: "p", kind: "healing-potion" }, haggler),
		).toBeNull();
		const sold = (progression: Progression) => {
			const state = {
				...room("zombie", 8, 40, progression),
				monsters: [],
				gold: 0,
				bag: createBag([sword]),
			};
			const after = sellCarriedEquipment(state, "sword");
			if ("error" in after) throw new Error(after.error);
			return after.gold;
		};
		expect(sold(none)).toBe(base);
		expect(sold(haggler)).toBe(Math.floor(base * 1.1));
	});
});
