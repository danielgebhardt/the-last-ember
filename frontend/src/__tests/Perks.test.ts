// @vitest-environment node
import { describe, expect, it } from "vitest";
import { applyPlayerAffliction } from "../domain/game/Afflictions";
import { deriveCombatStats } from "../domain/game/CombatStats";
import { createGameState, type GameState } from "../domain/game/GameState";
import { manaRecoveryInterval, maximumMana } from "../domain/game/Mana";
import { deriveAccuracy } from "../domain/game/MeleeRules";
import {
	herbalistBonus,
	opportunistBonus,
	playerSightRadius,
	scavengedGold,
} from "../domain/game/PerkEffects";
import {
	isValidPerkHistory,
	PERK_DEFINITIONS,
	PERK_LEVELS,
	type PerkKind,
	pendingPerk,
	pendingPerkCount,
	perkOffers,
} from "../domain/game/Perks";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { maximumHealth } from "../domain/game/PlayerHealth";
import {
	createProgression,
	type Progression,
} from "../domain/game/Progression";
import { SPELL_DEFINITIONS, spellPotency } from "../domain/game/Spells";
import { createEquipment } from "../domain/items/Equipment";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { validateSaveDocument } from "../domain/saves/SaveValidation";
import { savedAdventure } from "./SaveTestHelpers";
import { createTestDungeonFloor } from "./testhelpers";

const withPerks = (...perks: PerkKind[]): Progression => ({
	...createProgression(),
	experience: 3800,
	perks: perks.map((perk, index) => ({ level: PERK_LEVELS[index], perk })),
});
// The first seed whose level-three offer includes the perk.
const seedOffering = (perk: PerkKind) => {
	for (let seed = 1; ; seed += 1)
		if (perkOffers(seed, 3, []).includes(perk)) return seed;
};
const levelThree = (seed: number): GameState => {
	const state = createGameState({
		seed,
		activeFloor: 1,
		playerCoordinate: { row: 1, col: 1 },
		floors: [
			createTestDungeonFloor({
				floorNumber: 1,
				rows: 8,
				cols: 8,
				room: { startRow: 1, endRow: 6, startCol: 1, endCol: 6 },
			}),
		],
	});
	const progression = { ...state.progression, experience: 30 };
	const maxHealth = maximumHealth(progression, state.equipment);
	return {
		...state,
		monsters: [],
		progression,
		player: { maxHealth, health: maxHealth - 5 },
		mana: 2,
	};
};
const choose = (state: GameState, perk: PerkKind) =>
	resolvePlayerAction(state, { type: "choose-perk", perk });

describe("Perk offers", () => {
	it("offers three perks from three different families, fixed by seed and level", () => {
		for (let seed = 1; seed <= 50; seed += 1)
			for (const level of PERK_LEVELS) {
				const offers = perkOffers(seed, level, []);
				expect(offers).toHaveLength(3);
				expect(
					new Set(offers.map((perk) => PERK_DEFINITIONS[perk].family)).size,
				).toBe(3);
				expect(perkOffers(seed, level, [])).toEqual(offers);
			}
	});
	it("never offers a perk already taken and still fills three families late", () => {
		const taken: PerkKind[] = [];
		for (const level of PERK_LEVELS) {
			const offers = perkOffers(7357, level, taken);
			expect(offers).toHaveLength(3);
			expect(offers.some((perk) => taken.includes(perk))).toBe(false);
			taken.push(offers[0]);
		}
	});
	it("waits at odd levels from three and resolves the earliest level first", () => {
		const progression = { ...createProgression(), experience: 100 };
		expect(pendingPerkCount({ ...progression, experience: 29 })).toBe(0);
		expect(pendingPerkCount(progression)).toBe(2);
		expect(pendingPerk(1, progression)?.level).toBe(3);
		expect(pendingPerkCount({ ...progression, experience: 3800 })).toBe(9);
	});
});

describe("Choosing a perk", () => {
	it("is free, raises current health with Tough and logs the choice", () => {
		const state = levelThree(seedOffering("tough"));
		const result = choose(state, "tough");
		expect(result.turnAdvanced).toBe(false);
		expect(result.state.turn).toBe(state.turn);
		expect(result.state.player).toEqual({
			maxHealth: state.player.maxHealth + 4,
			health: state.player.health + 4,
		});
		expect(result.state.progression.perks).toEqual([
			{ level: 3, perk: "tough" },
		]);
		expect(result.state.activityHistory.entries.at(-1)?.event).toMatchObject({
			type: "perk-chosen",
			perk: "tough",
			level: 3,
		});
		expect(pendingPerk(state.run.seed, result.state.progression)).toBeNull();
	});
	it("raises current mana with Deep reserves", () => {
		const state = levelThree(seedOffering("deep-reserves"));
		const result = choose(state, "deep-reserves");
		expect(result.state.mana).toBe(state.mana + 3);
		expect(maximumMana(result.state.progression)).toBe(
			maximumMana(state.progression) + 3,
		);
	});
	it("rejects perks not offered, nothing waiting, and finished adventures", () => {
		const state = levelThree(seedOffering("tough"));
		const unoffered = (Object.keys(PERK_DEFINITIONS) as PerkKind[]).find(
			(perk) =>
				!pendingPerk(state.run.seed, state.progression)?.offers.includes(perk),
		) as PerkKind;
		expect(choose(state, unoffered)).toMatchObject({
			state,
			turnAdvanced: false,
			error: "That perk isn't offered at this level.",
		});
		const early = { ...state, progression: createProgression() };
		expect(choose(early, "tough").error).toBe(
			"No perk is waiting to be chosen.",
		);
		const dead = { ...state, player: { ...state.player, health: 0 } };
		expect(choose(dead, "tough").state).toBe(dead);
	});
});

describe("Perk effects", () => {
	const base = withPerks();
	const equipment = createEquipment();
	it("adjusts combat, accuracy and magic", () => {
		expect(deriveCombatStats(equipment, withPerks("brutal")).attack).toBe(
			deriveCombatStats(equipment, base).attack + 1,
		);
		expect(deriveCombatStats(equipment, withPerks("iron-hide")).armor).toBe(
			deriveCombatStats(equipment, base).armor + 1,
		);
		const low = { ...createProgression(), experience: 0 };
		expect(
			deriveAccuracy({ ...low, perks: [{ level: 3, perk: "precise" }] })
				.playerHitChance,
		).toBe(deriveAccuracy(low).playerHitChance + 5);
		expect(
			deriveAccuracy({ ...low, perks: [{ level: 3, perk: "evasive" }] })
				.evadeChance,
		).toBe(deriveAccuracy(low).evadeChance + 5);
		const missile = SPELL_DEFINITIONS["magic-missile"];
		expect(spellPotency(withPerks("spellfocus"), missile)).toMatchObject({
			minimumDamage:
				(spellPotency(base, missile) as { minimumDamage: number })
					.minimumDamage + 1,
		});
		expect(manaRecoveryInterval(withPerks("quick-recovery"))).toBe(24);
		expect(manaRecoveryInterval(base)).toBe(30);
	});
	it("adjusts situational bonuses", () => {
		const opportunist = withPerks("opportunist");
		expect(opportunistBonus(opportunist, {})).toBe(2);
		expect(
			opportunistBonus(opportunist, {
				awareness: {
					type: "pursuing",
					target: { row: 1, col: 1 },
					remaining: 3,
					blocked: 0,
				},
			}),
		).toBe(0);
		expect(opportunistBonus(base, {})).toBe(0);
		expect(herbalistBonus(withPerks("herbalist"))).toBe(2);
		expect(scavengedGold(withPerks("scavenger"), 10)).toBe(12);
		expect(scavengedGold(base, 10)).toBe(10);
		expect(playerSightRadius(4, withPerks("keen-eyes"), [])).toBe(5);
	});
	it("shortens poison with Antivenom and timed afflictions with Resilient", () => {
		const state = levelThree(1);
		const poison = (progression: Progression) =>
			applyPlayerAffliction({ ...state, progression }, "poisoned", "test")
				.afflictions[0]?.remaining;
		expect(poison(base)).toBe(6);
		expect(poison(withPerks("antivenom"))).toBe(3);
		expect(poison(withPerks("resilient"))).toBe(5);
		expect(poison(withPerks("antivenom", "resilient"))).toBe(3);
	});
});

describe("Perk saves", () => {
	it("saves and restores chosen perks, and rejects a perk never offered", () => {
		const restored = restoreSave(savedAdventure());
		const progression = { ...restored.state.progression, experience: 30 };
		const maxHealth = maximumHealth(
			progression,
			restored.state.equipment,
			restored.state.afflictions,
		);
		const offered = pendingPerk(restored.state.run.seed, progression)
			?.offers[0] as PerkKind;
		const chosen = choose(
			{
				...restored.state,
				progression,
				player: { maxHealth, health: maxHealth },
			},
			offered,
		).state;
		const document = createSaveDocument(
			chosen,
			restored.exploration,
			restored.configuration,
			restored.fog,
		);
		const parsed = parseSave(serializeSave(document));
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) throw new Error(parsed.error);
		expect(restoreSave(parsed.value).state.progression.perks).toEqual([
			{ level: 3, perk: offered },
		]);
		expect(isValidPerkHistory(chosen.run.seed, chosen.progression)).toBe(true);
		const unoffered = (Object.keys(PERK_DEFINITIONS) as PerkKind[]).find(
			(perk) => !perkOffers(chosen.run.seed, 3, []).includes(perk),
		) as PerkKind;
		const tampered = structuredClone(document);
		tampered.state.progression.perks = [{ level: 3, perk: unoffered }];
		expect(validateSaveDocument(tampered).ok).toBe(false);
		const early = structuredClone(document);
		early.state.progression.perks = [{ level: 5, perk: offered }];
		expect(validateSaveDocument(early).ok).toBe(false);
	});
});
