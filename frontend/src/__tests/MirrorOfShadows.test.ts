// @vitest-environment node
import { expect, it } from "vitest";
import type { GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { actorMaximumHealth } from "../domain/monsters/MonsterStats";
import {
	isFloorRevealed,
	MIRROR_HOSTILE_ID,
	MIRROR_REFLECTION_ID,
	type MirrorShatterOutcome,
	mirrorHostileKind,
	mirrorRewardKind,
	mirrorShatterOutcome,
	reflectionStats,
} from "../domain/objects/MirrorOfShadows";
import { objectChoices } from "../domain/objects/ObjectChoices";
import type { ObjectChoice } from "../domain/objects/ObjectInteraction";
import { rareDiscoverySelection } from "../domain/objects/RareDiscoveryPlacement";
import { parseSave, serializeSave } from "../domain/saves/SaveFormat";
import { bruteEncounter } from "./BruteTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";

const MIRROR = {
	id: "floor:4:object:mirror:1",
	kind: "mirror" as const,
	floorNumber: 4,
	coordinate: { row: 4, col: 5 },
	activated: false,
};
const seedWhere = (test: (seed: number) => boolean) => {
	let seed = 0;
	while (!test(seed)) seed++;
	return seed;
};
// The player stands at 4,4 beside the mirror in an open 13×13 room on floor 4.
const encounter = (seed = 0): GameState => {
	const state = bruteEncounter();
	return {
		...state,
		run: { ...state.run, seed },
		objects: [MIRROR],
		monsters: [],
	};
};
// Every other room tile holds an item, so nothing can emerge.
const crowded = (state: GameState): GameState => {
	const floorItems = [];
	for (let row = 1; row <= 13; row++)
		for (let col = 1; col <= 13; col++)
			if (!(row === 4 && (col === 4 || col === 5)))
				floorItems.push({
					item: { id: `filler:${row}:${col}`, kind: "healing-potion" as const },
					floorNumber: 4,
					coordinate: { row, col },
				});
	return { ...state, floorItems };
};
const use = (state: GameState, choice: ObjectChoice) =>
	resolvePlayerAction(state, {
		type: "interact",
		objectId: MIRROR.id,
		choice,
	});
const shatterSeed = (outcome: MirrorShatterOutcome) =>
	seedWhere((seed) => mirrorShatterOutcome(seed, MIRROR) === outcome);
const savesCleanly = (state: GameState) =>
	parseSave(serializeSave(tacticalSnapshot(state))).ok;

it("offers three explained choices, keeping your reflection's strength a surprise", () => {
	const state = encounter();
	const choices = objectChoices(MIRROR, state);
	expect(choices.map((c) => c.value)).toEqual([
		"mirror-reveal",
		"mirror-reflection",
		"mirror-shatter",
	]);
	const stats = reflectionStats(state);
	expect(choices[1].description).not.toContain(String(stats.maxHealth));
	expect(choices[2].outcomes?.map((o) => o.chance)).toEqual([0.6, 0.25, 0.15]);
});

it("reveal spends the mirror and a turn, and marks only that floor revealed", () => {
	const result = use(encounter(), "mirror-reveal");
	expect(result.turnAdvanced).toBe(true);
	expect(result.state.objects[0]).toMatchObject({
		activated: true,
		mirrorResult: { choice: "reveal" },
	});
	expect(isFloorRevealed(result.state.objects, 4)).toBe(true);
	expect(isFloorRevealed(result.state.objects, 3)).toBe(false);
	expect(result.state.floorItems).toEqual(encounter().floorItems);
	expect(savesCleanly(result.state)).toBe(true);
	const again = use(result.state, "mirror-shatter");
	expect(again.turnAdvanced).toBe(false);
	expect(again.state).toBe(result.state);
});

it("summons a reflection with half your effective max HP and your minimum melee damage", () => {
	// Maximum HP is 10 here, so the reflection gets 5; current HP doesn't matter.
	const state = {
		...encounter(),
		player: { ...encounter().player, health: 7 },
	};
	expect(state.player.maxHealth).toBe(10);
	const result = use(state, "mirror-reflection");
	expect(result.turnAdvanced).toBe(true);
	const reflection = result.state.monsters.find(
		(m) => m.id === `4:${MIRROR_REFLECTION_ID}`,
	);
	expect(reflection).toMatchObject({
		kind: "reflection",
		reflection: {
			maxHealth: 5,
			attackDamage: reflectionStats(state).attackDamage,
		},
	});
	expect(reflection?.health).toBe(5);
	expect(reflection && actorMaximumHealth(reflection, 1)).toBe(5);
	expect(savesCleanly(result.state)).toBe(true);
	// Difficulty scales the snapshot like any enemy's base stats.
	const harder = use({ ...state, difficulty: 1.25 }, "mirror-reflection");
	expect(
		harder.state.monsters.find((m) => m.kind === "reflection")?.health,
	).toBe(6);
});

it("a defeated reflection drops the mirror's fixed reward at +1", () => {
	const seed = seedWhere((s) => mirrorRewardKind(s, MIRROR) !== undefined);
	const summoned = use(encounter(seed), "mirror-reflection").state;
	const reflection = summoned.monsters[0];
	const weak = {
		...summoned,
		monsters: [{ ...reflection, health: 1, coordinate: { row: 4, col: 3 } }],
	};
	const killed = resolvePlayerAction(
		weak,
		{ type: "move", direction: "left" },
		() => ({ d20: () => 20, damage: (_min, max) => max }),
	).state;
	expect(killed.monsters.some((m) => m.kind === "reflection")).toBe(false);
	expect(killed.floorItems).toContainEqual({
		item: {
			id: `monster:${reflection.id}:loot`,
			kind: mirrorRewardKind(seed, MIRROR),
			enchantment: 1,
		},
		floorNumber: 4,
		coordinate: { row: 4, col: 3 },
	});
	expect(savesCleanly(killed)).toBe(true);
});

it("refuses the reflection for free when it has no room to appear", () => {
	const state = crowded(encounter());
	const result = use(state, "mirror-reflection");
	expect(result.turnAdvanced).toBe(false);
	expect(result.error).toMatch(/no room/);
	expect(result.state).toBe(state);
});

it("shatter rolls 60/25/15 from a fixed per-mirror stream", () => {
	const counts = { item: 0, empty: 0, hostile: 0 };
	for (let seed = 0; seed < 3000; seed++)
		counts[mirrorShatterOutcome(seed, MIRROR)]++;
	expect(Math.abs(counts.item / 3000 - 0.6)).toBeLessThan(0.03);
	expect(Math.abs(counts.empty / 3000 - 0.25)).toBeLessThan(0.03);
	expect(Math.abs(counts.hostile / 3000 - 0.15)).toBeLessThan(0.03);
});

it("shatter leaves the reward, nothing, or a hostile creature, and saves validate it", () => {
	const itemSeed = shatterSeed("item");
	const item = use(encounter(itemSeed), "mirror-shatter").state;
	expect(item.floorItems).toContainEqual({
		item: {
			id: `${MIRROR.id}:reward`,
			kind: mirrorRewardKind(itemSeed, MIRROR),
			enchantment: 1,
		},
		floorNumber: 4,
		coordinate: MIRROR.coordinate,
	});
	expect(item.objects[0].mirrorResult).toEqual({
		choice: "shatter",
		outcome: "item",
	});
	expect(savesCleanly(item)).toBe(true);

	const quiet = encounter(shatterSeed("empty"));
	const empty = use(quiet, "mirror-shatter").state;
	expect(empty.floorItems).toEqual(quiet.floorItems);
	expect(empty.monsters).toEqual([]);

	const hostileSeed = shatterSeed("hostile");
	const hostile = use(encounter(hostileSeed), "mirror-shatter").state;
	expect(hostile.monsters[0]).toMatchObject({
		id: `4:${MIRROR_HOSTILE_ID}`,
		kind: mirrorHostileKind(hostileSeed, MIRROR),
	});
	expect(savesCleanly(hostile)).toBe(true);

	// A recorded outcome must match the seed.
	const document = tacticalSnapshot(item);
	const forged = {
		...document,
		state: {
			...document.state,
			objects: [
				{
					...document.state.objects[0],
					mirrorResult: { choice: "shatter", outcome: "hostile" },
				},
			],
		},
	} as typeof document;
	expect(parseSave(serializeSave(forged)).ok).toBe(false);
});

it("a hostile shatter with no room deals a 15% backlash that can kill", () => {
	const seed = shatterSeed("hostile");
	// 15% of maximum HP 10, rounded up.
	const state = crowded(encounter(seed));
	const hurt = use(state, "mirror-shatter").state;
	expect(hurt.monsters).toEqual([]);
	expect(hurt.player.health).toBe(8);
	const entry = hurt.activityHistory.entries.find(
		({ event }) => event.type === "mirror-used",
	);
	expect(entry?.event).toMatchObject({ outcome: "hostile", damage: 2 });
	const fatal = use(
		{ ...state, player: { ...state.player, health: 2 } },
		"mirror-shatter",
	);
	expect(fatal.state.player.health).toBe(0);
	expect(fatal.turnAdvanced).toBe(true);
});

it("joins the shared discovery pool from floor 4", () => {
	const kinds = new Set<string>();
	for (let seed = 0; seed < 800; seed++) {
		const choice = rareDiscoverySelection({
			seed,
			floors: Array.from({ length: 20 }, (_, index) => ({
				floorNumber: index + 1,
			})),
		} as Parameters<typeof rareDiscoverySelection>[0]);
		if (choice?.kind !== "mirror") continue;
		kinds.add(choice.kind);
		expect(choice.floorNumber).toBeGreaterThanOrEqual(4);
	}
	expect(kinds.has("mirror")).toBe(true);
});
