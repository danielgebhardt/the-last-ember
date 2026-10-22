// @vitest-environment node
import { expect, it } from "vitest";
import { deriveAttributes } from "../domain/game/Attributes";
import { deriveCombatStats } from "../domain/game/CombatStats";
import { createGameState } from "../domain/game/GameState";
import { maximumMana } from "../domain/game/Mana";
import { deriveAccuracy } from "../domain/game/MeleeRules";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { SPELL_DEFINITIONS, spellPotency } from "../domain/game/Spells";
import { createBag } from "../domain/items/Bag";
import { createEquipment } from "../domain/items/Equipment";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";
import { savedAdventure } from "./SaveTestHelpers";

it("both rings add to effective stats while earned progression stays unchanged", () => {
	const equipment = createEquipment(
		null,
		null,
		null,
		null,
		{ id: "str", kind: "ring-strength" },
		{ id: "dex", kind: "ring-dexterity" },
	);
	const progression = { experience: 0 };
	expect(deriveAttributes(progression, [], equipment)).toMatchObject({
		strength: 12,
		dexterity: 12,
	});
	expect(deriveCombatStats(equipment, progression).attack).toBe(2);
	// Dexterity 12 is below the first evasion step (14), so only accuracy rises.
	expect(deriveAccuracy(progression, [], equipment)).toMatchObject({
		playerHitChance: 90,
		evadeChance: 20,
	});
	expect(progression.experience).toBe(0);
});
it("Intelligence rings affect spell potency and mana capacity through the same calculation", () => {
	const equipment = createEquipment(
		null,
		null,
		null,
		null,
		{ id: "int", kind: "ring-intelligence" },
		{ id: "mana", kind: "ring-mana" },
	);
	expect(maximumMana({ experience: 0 }, equipment)).toBe(16);
	expect(
		spellPotency(
			{ experience: 0 },
			SPELL_DEFINITIONS["magic-missile"],
			equipment,
		),
	).toMatchObject({ minimumDamage: 4, maximumDamage: 6 });
});
it("capacity rings increase maximums without healing or refilling, and removal clamps resources", () => {
	const initial = {
		...createGameState(createCorridorEncounter()),
		monsters: [],
		bag: createBag([
			{ id: "hp", kind: "ring-vitality" },
			{ id: "mp", kind: "ring-mana" },
		]),
	};
	let state = resolvePlayerAction(initial, {
		type: "equip",
		itemId: "hp",
		slot: "leftRing",
	}).state;
	expect(state.player).toEqual({ health: 10, maxHealth: 14 });
	state = resolvePlayerAction(state, {
		type: "equip",
		itemId: "mp",
		slot: "rightRing",
	}).state;
	expect(state.mana).toBe(10);
	expect(maximumMana(state.progression, state.equipment)).toBe(14);
	state = { ...state, player: { health: 14, maxHealth: 14 }, mana: 14 };
	state = resolvePlayerAction(state, {
		type: "unequip",
		slot: "leftRing",
	}).state;
	expect(state.player).toEqual({ health: 10, maxHealth: 10 });
	state = resolvePlayerAction(state, {
		type: "unequip",
		slot: "rightRing",
	}).state;
	expect(state.mana).toBe(10);
});

it("Dexterity equipment changes the monster's real response on the equip turn", () => {
	const initial = {
		...createGameState(createCorridorEncounter()),
		// Level 2's Dexterity 12 plus the ring reaches the first evasion step.
		progression: { experience: 10 },
		bag: createBag([{ id: "dex", kind: "ring-dexterity" }]),
		monsters: [
			{
				id: "1:1",
				kind: "orc" as const,
				floorNumber: 1,
				coordinate: { row: 1, col: 2 },
				health: 7,
				intent: { type: "idle" as const },
			},
		],
	};
	const equipped = resolvePlayerAction(
		initial,
		{ type: "equip", itemId: "dex", slot: "rightRing" },
		() => ({ d20: () => 5, damage: (min) => min }),
	).state;
	expect(equipped.player.health).toBe(10);
	expect(equipped.activityHistory.entries.at(-1)?.event.type).toBe(
		"monster-missed",
	);
});
it("a saved capacity loadout resumes without applying its bonus twice", () => {
	const original = restoreSave(savedAdventure());
	const initial = {
		...original.state,
		monsters: [],
		bag: createBag([
			{ id: "hp", kind: "ring-vitality" },
			{ id: "int", kind: "ring-intelligence" },
		]),
	};
	let state = resolvePlayerAction(initial, {
		type: "equip",
		itemId: "hp",
		slot: "leftRing",
	}).state;
	state = resolvePlayerAction(state, {
		type: "equip",
		itemId: "int",
		slot: "rightRing",
	}).state;
	state = { ...state, mana: 12 };
	const saved = createSaveDocument(
		state,
		original.exploration,
		original.configuration,
		original.fog,
	);
	const parsed = parseSave(serializeSave(saved));
	expect(parsed.ok).toBe(true);
	if (!parsed.ok) throw new Error(parsed.error);
	const resumed = restoreSave(parsed.value).state;
	expect(resumed.player).toEqual({
		health: original.state.player.health,
		maxHealth: 14,
	});
	expect(resumed.mana).toBe(12);
	expect(
		parseSave(
			serializeSave(
				createSaveDocument(
					resumed,
					original.exploration,
					original.configuration,
					original.fog,
				),
			),
		).ok,
	).toBe(true);
});
it("mana potions and recovery use equipped capacity", () => {
	const initial = {
		...createGameState(createCorridorEncounter()),
		monsters: [],
		equipment: createEquipment(null, null, null, null, {
			id: "mp",
			kind: "ring-mana",
		}),
		mana: 10,
		bag: createBag([{ id: "potion", kind: "mana-potion" }]),
	};
	const consumed = resolvePlayerAction(initial, {
		type: "consume",
		itemId: "potion",
	}).state;
	expect(consumed.mana).toBe(14);
	const recovered = resolvePlayerAction(
		{ ...initial, turn: 29 },
		{ type: "wait" },
	).state;
	expect(recovered.mana).toBe(11);
});

it("copper rings contribute armor from both slots without counting other armor twice", () => {
	const initial = createGameState(createCorridorEncounter());
	const equipment = {
		...initial.equipment,
		leftRing: { id: "ward:1", kind: "copper-ring" as const },
		rightRing: { id: "ward:2", kind: "copper-ring" as const },
	};
	expect(deriveCombatStats(equipment, initial.progression).armor).toBe(3);
});
