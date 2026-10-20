// @vitest-environment node
import { expect, it } from "vitest";
import type { GameState } from "../domain/game/GameState";
import { permanentAttributeGains } from "../domain/game/PermanentAttributes";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { rareDiscoverySelection } from "../domain/objects/RareDiscoveryPlacement";
import {
	WELL_OFFERINGS,
	WELL_SPAWN_ID,
	type WellOffering,
	type WellOutcome,
	wellHostileKind,
	wellOutcome,
	wellReward,
} from "../domain/objects/WishingWell";
import { parseSave, serializeSave } from "../domain/saves/SaveFormat";
import { bruteEncounter } from "./BruteTestHelpers";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";

const WELL = {
	id: "floor:4:object:well:1",
	kind: "well" as const,
	floorNumber: 4,
	coordinate: { row: 4, col: 5 },
	activated: false,
};
const seedWhere = (test: (seed: number) => boolean) => {
	let seed = 0;
	while (!test(seed)) seed++;
	return seed;
};
const encounter = (seed: number): GameState => {
	const state = bruteEncounter();
	return {
		...state,
		run: { ...state.run, seed },
		objects: [WELL],
		monsters: [],
		gold: 1000,
	};
};
const offer = (state: GameState, offering: WellOffering) =>
	resolvePlayerAction(state, {
		type: "interact",
		objectId: WELL.id,
		choice: `offer-${offering}`,
	});
const outcomeSeed = (outcome: WellOutcome, offering: WellOffering) =>
	seedWhere((seed) => wellOutcome(seed, WELL, offering) === outcome);

it("uses one nested roll per well, so a larger offering only improves the result", () => {
	const counts = { 50: [0, 0], 100: [0, 0], 250: [0, 0] };
	for (let seed = 0; seed < 2000; seed++) {
		const [low, mid, high] = WELL_OFFERINGS.map((o) =>
			wellOutcome(seed, WELL, o),
		);
		const rank = { negative: 0, neutral: 1, positive: 2 };
		expect(rank[mid]).toBeGreaterThanOrEqual(rank[low]);
		expect(rank[high]).toBeGreaterThanOrEqual(rank[mid]);
		for (const [offering, outcome] of [
			[50, low],
			[100, mid],
			[250, high],
		] as const) {
			if (outcome === "positive") counts[offering][0]++;
			if (outcome === "negative") counts[offering][1]++;
		}
	}
	for (const [offering, positive, negative] of [
		[50, 0.4, 0.2],
		[100, 0.55, 0.2],
		[250, 0.7, 0.15],
	] as const) {
		expect(Math.abs(counts[offering][0] / 2000 - positive)).toBeLessThan(0.04);
		expect(Math.abs(counts[offering][1] / 2000 - negative)).toBeLessThan(0.04);
	}
});

it("a gear reward leaves an enchanted floor-pool item by tier and spends gold, turn and well", () => {
	const seed = seedWhere(
		(s) =>
			wellOutcome(s, WELL, 100) === "positive" &&
			wellReward(s, WELL)?.type === "gear",
	);
	const state = encounter(seed);
	const result = offer(state, 100);
	expect(result.turnAdvanced).toBe(true);
	expect(result.state.gold).toBe(900);
	const reward = wellReward(seed, WELL);
	expect(result.state.floorItems).toContainEqual({
		item: {
			id: `${WELL.id}:reward`,
			kind: reward?.type === "gear" ? reward.kind : undefined,
			enchantment: 2,
		},
		floorNumber: 4,
		coordinate: WELL.coordinate,
	});
	expect(result.state.objects[0]).toMatchObject({
		activated: true,
		wellResult: { offering: 100, outcome: "positive" },
	});
	expect(parseSave(serializeSave(tacticalSnapshot(result.state))).ok).toBe(
		true,
	);
	const again = offer(result.state, 250);
	expect(again.turnAdvanced).toBe(false);
	expect(again.state).toBe(result.state);
});

it("a blessing permanently raises one attribute; neutral gives nothing", () => {
	const seed = seedWhere(
		(s) =>
			wellOutcome(s, WELL, 250) === "positive" &&
			wellReward(s, WELL)?.type === "blessing",
	);
	const reward = wellReward(seed, WELL);
	if (reward?.type !== "blessing") throw new Error("Expected a blessing");
	const blessed = offer(encounter(seed), 250).state;
	expect(permanentAttributeGains(blessed.progression)[reward.attribute]).toBe(
		1,
	);
	expect(blessed.floorItems).toEqual(encounter(seed).floorItems);

	const quiet = encounter(outcomeSeed("neutral", 50));
	const neutral = offer(quiet, 50);
	expect(neutral.turnAdvanced).toBe(true);
	expect(neutral.state.gold).toBe(950);
	expect(neutral.state.floorItems).toEqual(quiet.floorItems);
	expect(neutral.state.monsters).toEqual([]);
});

it("a hostile result spawns one ordinary floor creature that the save validates", () => {
	const seed = outcomeSeed("negative", 50);
	const result = offer(encounter(seed), 50);
	const spawned = result.state.monsters.find(
		(m) => m.id === `4:${WELL_SPAWN_ID}`,
	);
	expect(spawned).toMatchObject({
		kind: wellHostileKind(seed, WELL),
		floorNumber: 4,
	});
	expect(spawned?.heroic).toBeUndefined();
	const document = tacticalSnapshot(result.state);
	expect(parseSave(serializeSave(document)).ok).toBe(true);
	const withWell = (well: object) => ({
		...document,
		state: { ...document.state, objects: [well] },
	});
	// A recorded outcome must match the seed; a spawned creature needs its spent well.
	expect(
		parseSave(
			serializeSave(
				withWell({
					...document.state.objects[0],
					wellResult: { offering: 50, outcome: "positive" },
				}) as typeof document,
			),
		).ok,
	).toBe(false);
	expect(
		parseSave(serializeSave(withWell({ ...WELL }) as typeof document)).ok,
	).toBe(false);
});

it("rejects free without gold or a reviewed offering", () => {
	const state = { ...encounter(0), gold: 99 };
	for (const result of [
		offer(state, 100),
		resolvePlayerAction(state, { type: "interact", objectId: WELL.id }),
	]) {
		expect(result.turnAdvanced).toBe(false);
		expect(result.state).toBe(state);
	}
});

it("joins the shared discovery pool from floor 3", () => {
	const kinds = new Set<string>();
	for (let seed = 0; seed < 600; seed++) {
		const choice = rareDiscoverySelection({
			seed,
			floors: Array.from({ length: 20 }, (_, index) => ({
				floorNumber: index + 1,
			})),
		} as Parameters<typeof rareDiscoverySelection>[0]);
		if (!choice) continue;
		kinds.add(choice.kind);
		if (choice.kind === "well")
			expect(choice.floorNumber).toBeGreaterThanOrEqual(3);
	}
	expect([...kinds].sort()).toEqual(["forge", "sarcophagus", "well"]);
});
