// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { deriveAttributes } from "../domain/game/Attributes";
import { deriveCombatStats } from "../domain/game/CombatStats";
import { awardExperience } from "../domain/game/ExperienceRewards";
import { createGameState, type GameState } from "../domain/game/GameState";
import { deriveAccuracy } from "../domain/game/MeleeRules";
import {
	altarPacts,
	PACT_KINDS,
	type PactKind,
	pactHealing,
	pactKillExperience,
} from "../domain/game/Pacts";
import { haggledPrice, scavengedGold } from "../domain/game/PerkEffects";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { maximumHealth } from "../domain/game/PlayerHealth";
import { levelForExperience } from "../domain/game/Progression";
import { playerSpell } from "../domain/game/Spells";
import { createTestSeedState } from "../domain/game/TestSeed";
import { createStartingEquipment } from "../domain/items/Equipment";
import { generateEscapeEncounters } from "../domain/monsters/EscapeEncounters";
import { orthogonalDistance } from "../domain/monsters/MonsterLocations";
import { pursuitRulesFor } from "../domain/monsters/PursuitRules";
import { THIEF_SPAWN_ID } from "../domain/monsters/TreasureThief";
import {
	ALTAR_CHANCE,
	altarFloors,
	isDarkAltar,
	strikePact,
} from "../domain/objects/DarkAltar";
import type { DungeonObject } from "../domain/objects/DungeonObject";
import { objectChoices } from "../domain/objects/ObjectChoices";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const adventure = (seed: number, depth = 5) =>
	createGameState(
		connectDungeonFloors(
			generateDungeonRun(seed, depth, COMPACT_TEST_CONFIGURATION),
		),
	);
const SIDES = [
	{ row: -1, col: 0 },
	{ row: 1, col: 0 },
	{ row: 0, col: -1 },
	{ row: 0, col: 1 },
];
// A five-floor adventure whose altar offers the pact, with you beside the altar.
const besideAltar = (
	pact: PactKind,
): { state: GameState; altar: DungeonObject } => {
	for (let seed = 1; seed < 400; seed++) {
		const generated = adventure(seed);
		const altar = generated.objects.find(isDarkAltar);
		if (!altar || !altarPacts(seed, altar).includes(pact)) continue;
		const floor = generated.run.floors[altar.floorNumber - 1];
		const beside = SIDES.map((d) => ({
			row: altar.coordinate.row + d.row,
			col: altar.coordinate.col + d.col,
		})).find(
			(p) =>
				floor.terrain[p.row]?.[p.col] === "." &&
				![...generated.objects, ...generated.monsters].some(
					(entry) =>
						entry.floorNumber === altar.floorNumber &&
						orthogonalDistance(entry.coordinate, p) === 0,
				),
		);
		if (!beside) continue;
		return {
			altar,
			state: {
				...generated,
				run: {
					...generated.run,
					activeFloor: altar.floorNumber,
					playerCoordinate: beside,
				},
			},
		};
	}
	throw new Error(`Expected an altar offering ${pact}`);
};
const strike = (pact: PactKind) => {
	const { state, altar } = besideAltar(pact);
	const result = resolvePlayerAction(state, {
		type: "interact",
		objectId: altar.id,
		choice: `pact-${pact}`,
	});
	return { before: state, after: result.state, altar, result };
};
const saves = (state: GameState) =>
	parseSave(serializeSave(tacticalSnapshot(state)));
const bound = (state: GameState, pact: PactKind): GameState => ({
	...state,
	progression: { ...state.progression, pact },
});

describe("Pacts at a dark altar", () => {
	it("hides one altar in about half of adventures, in the middle third, away from the arrival stair, the same way every time", () => {
		let found = 0;
		const seeds = 80;
		for (let seed = 1; seed <= seeds; seed++) {
			const state = adventure(seed, 20);
			const altars = state.objects.filter(isDarkAltar);
			expect(adventure(seed, 20).objects.filter(isDarkAltar)).toEqual(altars);
			expect(altars.length).toBeLessThanOrEqual(1);
			for (const altar of altars) {
				found++;
				expect(altarFloors(20)).toContain(altar.floorNumber);
				const arrival =
					state.run.floors[altar.floorNumber - 1].upStair?.coordinate;
				if (!arrival) throw new Error("Expected an arrival stair");
				expect(
					orthogonalDistance(altar.coordinate, arrival),
				).toBeGreaterThanOrEqual(3);
			}
		}
		expect(found / seeds).toBeGreaterThan(ALTAR_CHANCE - 0.2);
		expect(found / seeds).toBeLessThan(ALTAR_CHANCE + 0.2);
		expect(altarFloors(20)).toEqual([7, 8, 9, 10, 11, 12, 13, 14]);
		expect(altarFloors(5)).toEqual([2, 3, 4]);
	});

	it("puts an altar on the test seed's first floor", () => {
		const altar = createTestSeedState(COMPACT_TEST_CONFIGURATION).objects.find(
			isDarkAltar,
		);
		expect(altar?.floorNumber).toBe(1);
	});

	it("offers three different pacts fixed by seed, as gain-and-cost choices", () => {
		const { state, altar } = besideAltar("blood");
		const offered = altarPacts(state.run.seed, altar);
		expect(new Set(offered).size).toBe(3);
		expect(altarPacts(state.run.seed, altar)).toEqual(offered);
		const choices = objectChoices(altar, state);
		expect(choices.map((c) => c.value)).toEqual(
			offered.map((pact) => `pact-${pact}`),
		);
		for (const choice of choices)
			expect(choice.outcomes?.map((o) => o.tone)).toEqual(["good", "bad"]);
	});

	it("binds you to the chosen pact for one turn, silences the altar, and saves for every pact", () => {
		for (const pact of PACT_KINDS) {
			const { after, altar, result } = strike(pact);
			expect(result.turnAdvanced).toBe(true);
			expect(after.progression.pact).toBe(pact);
			expect(after.objects.find((o) => o.id === altar.id)?.activated).toBe(
				true,
			);
			expect(
				after.activityHistory.entries.some(
					({ event }) => event.type === "pact-struck" && event.pact === pact,
				),
			).toBe(true);
			const parsed = saves(after);
			if (!parsed.ok) throw new Error(`${pact}: ${parsed.error}`);
			expect(restoreSave(parsed.value).state.progression.pact).toBe(pact);
			// Only once: the silent altar refuses another bargain.
			expect(
				resolvePlayerAction(after, {
					type: "interact",
					objectId: altar.id,
					choice: `pact-${pact}`,
				}).turnAdvanced,
			).toBe(false);
		}
	});

	it("rejects a pact no altar offered, an altar used without one, and a second altar", () => {
		const { after, altar } = strike("iron");
		const unoffered = PACT_KINDS.find(
			(pact) => !altarPacts(after.run.seed, altar).includes(pact),
		);
		if (!unoffered) throw new Error("Expected an unoffered pact");
		expect(saves(bound(after, unoffered)).ok).toBe(false);
		const { pact: _, ...unbound } = after.progression;
		expect(saves({ ...after, progression: unbound }).ok).toBe(false);
		const before = { ...after, progression: unbound };
		expect(
			saves({
				...before,
				objects: before.objects.map((o) =>
					o.id === altar.id ? { ...o, activated: false } : o,
				),
			}).ok,
		).toBe(true);
		expect(
			saves({
				...after,
				objects: [...after.objects, { ...altar, id: `${altar.id}x` }],
			}).ok,
		).toBe(false);
	});

	it("Blood: +2 Strength and a fifth less maximum health, which stays consistent as you level", () => {
		const { before, after } = strike("blood");
		expect(deriveAttributes(after.progression).strength).toBe(
			deriveAttributes(before.progression).strength + 2,
		);
		expect(after.player.maxHealth).toBe(
			Math.floor(before.player.maxHealth * 0.8),
		);
		const grown = awardExperience(after, 500);
		expect(grown.player.maxHealth).toBe(
			maximumHealth(grown.progression, grown.equipment, grown.afflictions),
		);
		expect(saves(grown).ok).toBe(true);
	});

	it("Sight and Omens: floors revealed and monsters notice you farther; kills pay more and deeper floors gain omens", () => {
		const plain = adventure(1);
		expect(pursuitRulesFor(bound(plain, "sight")).detectionBonus).toBe(
			pursuitRulesFor(plain).detectionBonus + 2,
		);
		expect(pactKillExperience({ pact: "omens" }, 10)).toBe(12);
		expect(pactKillExperience({}, 10)).toBe(10);
		const { before, after, altar } = strike("omens");
		for (
			let floor = Math.max(altar.floorNumber + 1, 3);
			floor < after.run.floors.length;
			floor++
		)
			expect(after.omens?.some((o) => o.floorNumber === floor)).toBe(true);
		expect(before.omens?.every((o) => after.omens?.includes(o)) ?? true).toBe(
			true,
		);
	});

	it("Avarice, Ash and Iron: gold and prices, mana and potions, armor and evasion", () => {
		expect(scavengedGold({ experience: 0, pact: "avarice" }, 10)).toBe(15);
		expect(haggledPrice({ experience: 0, pact: "avarice" }, 75)).toBe(113);
		const ash = { experience: 0, pact: "ash" as const };
		expect(playerSpell("fireball", ash).cost).toBeLessThan(
			playerSpell("fireball", { experience: 0 }).cost,
		);
		expect(playerSpell("magic-missile", ash).cost).toBeGreaterThanOrEqual(1);
		expect(pactHealing(ash, 5)).toBe(2);
		const iron = { experience: 0, pact: "iron" as const };
		const equipment = createStartingEquipment();
		expect(deriveCombatStats(equipment, iron).armor).toBe(
			deriveCombatStats(equipment, { experience: 0 }).armor + 2,
		);
		const evade = deriveAccuracy({ experience: 0 }).evadeChance;
		expect(deriveAccuracy(iron).evadeChance).toBe(
			Math.max(5, Math.floor(evade / 10) * 5),
		);
	});

	it("Hunter's: a level at once, and more hunters on each return floor", () => {
		const { before, after } = strike("hunter");
		expect(levelForExperience(after.progression.experience)).toBe(
			levelForExperience(before.progression.experience) + 1,
		);
		const deep = adventure(7, 20);
		const escaping: GameState = {
			...deep,
			monsters: [],
			quest: { ...deep.quest, cureRecovered: true },
		};
		let plain = 0,
			hunted = 0;
		for (let floor = 2; floor < 19; floor++) {
			plain += generateEscapeEncounters(escaping, floor).length;
			hunted += generateEscapeEncounters(
				bound(escaping, "hunter"),
				floor,
			).length;
		}
		expect(hunted).toBeGreaterThan(plain);
	});

	it("Silence: thieves and sentries let you pass; fountains and wells refuse you", () => {
		const { after } = strike("silence");
		const thief = {
			id: `${after.run.activeFloor}:${THIEF_SPAWN_ID}`,
			kind: "treasure-thief" as const,
			floorNumber: after.run.activeFloor,
			coordinate: { ...after.run.playerCoordinate },
			health: 12,
			intent: { type: "idle" as const },
			lastDamagedTurn: null,
		};
		const floor = after.run.floors[after.run.activeFloor - 1];
		const beside = SIDES.map((d) => ({
			row: after.run.playerCoordinate.row + d.row,
			col: after.run.playerCoordinate.col + d.col,
		})).find(
			(p) =>
				floor.terrain[p.row]?.[p.col] === "." &&
				!after.objects.some(
					(o) =>
						o.floorNumber === after.run.activeFloor &&
						orthogonalDistance(o.coordinate, p) === 0,
				),
		);
		if (!beside) throw new Error("Expected a free tile beside you");
		const watched = {
			...after,
			gold: 1000,
			monsters: [{ ...thief, coordinate: beside }],
		};
		const waited = resolvePlayerAction(watched, { type: "wait" }).state;
		expect(waited.gold).toBe(1000);
		expect(waited.monsters[0].coordinate).toEqual(beside);
		const fountain: DungeonObject = {
			id: "floor:1:object:fountain:9",
			kind: "fountain",
			floorNumber: after.run.activeFloor,
			coordinate: beside,
			activated: false,
		};
		const state = { ...after, objects: [...after.objects, fountain] };
		expect(objectChoices(fountain, state)[0].warning).toContain("Silence");
		expect(
			resolvePlayerAction(state, {
				type: "interact",
				objectId: fountain.id,
				choice: "sip",
			}).turnAdvanced,
		).toBe(false);
		expect(strikePact(after, fountain, "sip")).toHaveProperty("error");
	});
});
